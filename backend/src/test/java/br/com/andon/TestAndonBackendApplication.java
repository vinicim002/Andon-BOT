package br.com.andon;

import org.springframework.boot.SpringApplication;

public class TestAndonBackendApplication {

	public static void main(String[] args) {
		SpringApplication.from(AndonBackendApplication::main).with(TestcontainersConfiguration.class).run(args);
	}

}
