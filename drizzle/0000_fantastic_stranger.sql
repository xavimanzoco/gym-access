CREATE TABLE `accesos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`socio_id` integer,
	`dni` text NOT NULL,
	`resultado` text NOT NULL,
	`motivo` text,
	`direccion` text DEFAULT 'entrada' NOT NULL,
	`fecha_hora` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`socio_id`) REFERENCES `socios`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `pagos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`socio_id` integer NOT NULL,
	`monto` real NOT NULL,
	`metodo` text DEFAULT 'efectivo' NOT NULL,
	`periodo_desde` integer NOT NULL,
	`periodo_hasta` integer NOT NULL,
	`creado_en` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`socio_id`) REFERENCES `socios`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `planes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nombre` text NOT NULL,
	`precio` real DEFAULT 0 NOT NULL,
	`dias_acceso` text DEFAULT '[1,2,3,4,5,6,7]' NOT NULL,
	`hora_desde` text,
	`hora_hasta` text,
	`activo` integer DEFAULT true NOT NULL,
	`creado_en` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `socios` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`dni` text NOT NULL,
	`nombre` text NOT NULL,
	`apellido` text NOT NULL,
	`telefono` text,
	`email` text,
	`plan_id` integer,
	`estado` text DEFAULT 'activo' NOT NULL,
	`creado_en` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`plan_id`) REFERENCES `planes`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `socios_dni_unique` ON `socios` (`dni`);--> statement-breakpoint
CREATE TABLE `usuarios_admin` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`nombre` text NOT NULL,
	`rol` text DEFAULT 'admin' NOT NULL,
	`creado_en` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `usuarios_admin_email_unique` ON `usuarios_admin` (`email`);