-- Modelo canônico inicial (Fase 0). Apenas o núcleo necessário para inbox, contatos e tickets;
-- o restante entra conforme as telas do console revelarem a necessidade.
-- Toda tabela de negócio carrega tenant_id. RLS será habilitada junto com o contexto de tenant.

-- ---------------------------------------------------------------------------
-- Tenant e entitlement
-- ---------------------------------------------------------------------------
CREATE TABLE tenant (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(160) NOT NULL,
    slug        VARCHAR(80)  NOT NULL UNIQUE,
    status      VARCHAR(20)  NOT NULL DEFAULT 'active'
                CHECK (status IN ('active', 'suspended', 'closed')),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Recursos e limites habilitados por tenant; cobrança financeira fica para depois.
CREATE TABLE tenant_entitlement (
    tenant_id    UUID        NOT NULL REFERENCES tenant (id),
    feature_key  VARCHAR(80) NOT NULL,
    enabled      BOOLEAN     NOT NULL DEFAULT TRUE,
    limit_value  BIGINT,
    PRIMARY KEY (tenant_id, feature_key)
);

-- ---------------------------------------------------------------------------
-- Identidade e RBAC
-- ---------------------------------------------------------------------------
CREATE TABLE app_user (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID         NOT NULL REFERENCES tenant (id),
    name        VARCHAR(160) NOT NULL,
    email       VARCHAR(254) NOT NULL,
    status      VARCHAR(20)  NOT NULL DEFAULT 'active'
                CHECK (status IN ('invited', 'active', 'disabled')),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, email)
);

CREATE TABLE role (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID         NOT NULL REFERENCES tenant (id),
    key         VARCHAR(60)  NOT NULL,
    name        VARCHAR(120) NOT NULL,
    permissions TEXT[]       NOT NULL DEFAULT '{}',
    UNIQUE (tenant_id, key)
);

CREATE TABLE user_role (
    user_id  UUID NOT NULL REFERENCES app_user (id),
    role_id  UUID NOT NULL REFERENCES role (id),
    PRIMARY KEY (user_id, role_id)
);

-- ---------------------------------------------------------------------------
-- Contatos (CRM mínimo)
-- ---------------------------------------------------------------------------
CREATE TABLE organization (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID         NOT NULL REFERENCES tenant (id),
    name        VARCHAR(160) NOT NULL,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE contact (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id        UUID         NOT NULL REFERENCES tenant (id),
    organization_id  UUID REFERENCES organization (id),
    name             VARCHAR(160),
    phone            VARCHAR(32),
    email            VARCHAR(254),
    attributes       JSONB        NOT NULL DEFAULT '{}',
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, phone)
);

CREATE TABLE tag (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id  UUID        NOT NULL REFERENCES tenant (id),
    name       VARCHAR(60) NOT NULL,
    color      VARCHAR(20),
    UNIQUE (tenant_id, name)
);

CREATE TABLE contact_tag (
    contact_id  UUID NOT NULL REFERENCES contact (id),
    tag_id      UUID NOT NULL REFERENCES tag (id),
    PRIMARY KEY (contact_id, tag_id)
);

-- ---------------------------------------------------------------------------
-- Canais e filas
-- Endpoint de canal não é fila: um número pode rotear para várias filas e vice-versa.
-- ---------------------------------------------------------------------------
CREATE TABLE channel_endpoint (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id     UUID         NOT NULL REFERENCES tenant (id),
    channel_type  VARCHAR(20)  NOT NULL CHECK (channel_type IN ('whatsapp', 'webchat', 'voice')),
    name          VARCHAR(120) NOT NULL,
    address       VARCHAR(120) NOT NULL,
    status        VARCHAR(20)  NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'connected', 'disconnected', 'disabled')),
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, channel_type, address)
);

CREATE TABLE operational_queue (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID         NOT NULL REFERENCES tenant (id),
    name            VARCHAR(120) NOT NULL,
    routing_policy  VARCHAR(30)  NOT NULL DEFAULT 'round_robin'
                    CHECK (routing_policy IN ('round_robin', 'manual')),
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, name)
);

CREATE TABLE endpoint_queue (
    channel_endpoint_id  UUID NOT NULL REFERENCES channel_endpoint (id),
    queue_id             UUID NOT NULL REFERENCES operational_queue (id),
    PRIMARY KEY (channel_endpoint_id, queue_id)
);

CREATE TABLE queue_member (
    queue_id  UUID NOT NULL REFERENCES operational_queue (id),
    user_id   UUID NOT NULL REFERENCES app_user (id),
    PRIMARY KEY (queue_id, user_id)
);

-- ---------------------------------------------------------------------------
-- Conversas
-- ---------------------------------------------------------------------------
CREATE TABLE conversation (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id            UUID        NOT NULL REFERENCES tenant (id),
    contact_id           UUID        NOT NULL REFERENCES contact (id),
    channel_endpoint_id  UUID        NOT NULL REFERENCES channel_endpoint (id),
    queue_id             UUID REFERENCES operational_queue (id),
    assignee_id          UUID REFERENCES app_user (id),
    status               VARCHAR(30) NOT NULL DEFAULT 'new'
                         CHECK (status IN ('new', 'queued', 'in_progress', 'waiting_customer',
                                           'waiting_internal', 'resolved', 'closed')),
    bot_paused           BOOLEAN     NOT NULL DEFAULT FALSE,
    last_message_at      TIMESTAMPTZ,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    closed_at            TIMESTAMPTZ
);

CREATE INDEX conversation_inbox_idx ON conversation (tenant_id, status, last_message_at DESC);

CREATE TABLE message (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id            UUID        NOT NULL REFERENCES tenant (id),
    conversation_id      UUID        NOT NULL REFERENCES conversation (id),
    direction            VARCHAR(10) NOT NULL CHECK (direction IN ('inbound', 'outbound', 'internal')),
    sender_type          VARCHAR(20) NOT NULL CHECK (sender_type IN ('contact', 'user', 'bot', 'system')),
    sender_user_id       UUID REFERENCES app_user (id),
    content_type         VARCHAR(20) NOT NULL DEFAULT 'text'
                         CHECK (content_type IN ('text', 'image', 'audio', 'video', 'document', 'location')),
    body                 TEXT,
    provider_message_id  VARCHAR(160),
    delivery_status      VARCHAR(20) CHECK (delivery_status IN ('pending', 'sent', 'delivered', 'read', 'failed')),
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX message_conversation_idx ON message (conversation_id, created_at);

-- Transferências, atribuições e mudanças de estado: eventos auditáveis da conversa.
CREATE TABLE conversation_event (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id        UUID        NOT NULL REFERENCES tenant (id),
    conversation_id  UUID        NOT NULL REFERENCES conversation (id),
    type             VARCHAR(40) NOT NULL,
    actor_user_id    UUID REFERENCES app_user (id),
    payload          JSONB       NOT NULL DEFAULT '{}',
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Tickets e protocolos (1 ticket : 1 protocolo, protocolo imutável)
-- ---------------------------------------------------------------------------
CREATE TABLE ticket (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id        UUID         NOT NULL REFERENCES tenant (id),
    protocol         VARCHAR(40)  NOT NULL,
    contact_id       UUID         NOT NULL REFERENCES contact (id),
    conversation_id  UUID REFERENCES conversation (id),
    assignee_id      UUID REFERENCES app_user (id),
    subject          VARCHAR(200) NOT NULL,
    priority         VARCHAR(10)  NOT NULL DEFAULT 'normal'
                     CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    status           VARCHAR(20)  NOT NULL DEFAULT 'open'
                     CHECK (status IN ('open', 'in_progress', 'waiting', 'resolved', 'closed')),
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
    resolved_at      TIMESTAMPTZ,
    UNIQUE (tenant_id, protocol)
);

CREATE FUNCTION prevent_protocol_change() RETURNS trigger AS $$
BEGIN
    IF NEW.protocol IS DISTINCT FROM OLD.protocol THEN
        RAISE EXCEPTION 'protocolo do ticket é imutável';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ticket_protocol_immutable
    BEFORE UPDATE ON ticket
    FOR EACH ROW EXECUTE FUNCTION prevent_protocol_change();

CREATE TABLE ticket_event (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id      UUID        NOT NULL REFERENCES tenant (id),
    ticket_id      UUID        NOT NULL REFERENCES ticket (id),
    type           VARCHAR(40) NOT NULL,
    actor_user_id  UUID REFERENCES app_user (id),
    payload        JSONB       NOT NULL DEFAULT '{}',
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Auditoria e outbox
-- ---------------------------------------------------------------------------
CREATE TABLE audit_event (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id      UUID        NOT NULL REFERENCES tenant (id),
    actor_user_id  UUID REFERENCES app_user (id),
    action         VARCHAR(80) NOT NULL,
    entity_type    VARCHAR(60) NOT NULL,
    entity_id      UUID,
    payload        JSONB       NOT NULL DEFAULT '{}',
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX audit_event_entity_idx ON audit_event (tenant_id, entity_type, entity_id);

-- Gravado na mesma transação do evento de negócio; consumido pelos workers.
CREATE TABLE outbox_event (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID        NOT NULL REFERENCES tenant (id),
    aggregate_type  VARCHAR(60) NOT NULL,
    aggregate_id    UUID        NOT NULL,
    event_type      VARCHAR(80) NOT NULL,
    payload         JSONB       NOT NULL,
    attempts        INT         NOT NULL DEFAULT 0,
    available_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    locked_until    TIMESTAMPTZ,
    processed_at    TIMESTAMPTZ,
    last_error      TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX outbox_pending_idx ON outbox_event (available_at) WHERE processed_at IS NULL;
