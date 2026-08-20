CREATE TABLE `client_delivery_snapshots` (
	`id` varchar(32) NOT NULL,
	`organizationId` varchar(32) NOT NULL,
	`templateId` varchar(32),
	`targetType` enum('market_scan','portfolio_mandate','agent_run') NOT NULL,
	`targetId` varchar(32) NOT NULL,
	`outputFormat` enum('pdf','pptx','markdown') NOT NULL,
	`contentDigest` varchar(128) NOT NULL,
	`contentJson` longtext NOT NULL,
	`citationsJson` longtext NOT NULL,
	`approvedByUserId` int NOT NULL,
	`approvedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `client_delivery_snapshots_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `client_delivery_templates` (
	`id` varchar(32) NOT NULL,
	`organizationId` varchar(32) NOT NULL,
	`createdByUserId` int NOT NULL,
	`name` varchar(160) NOT NULL,
	`clientLabel` varchar(180) NOT NULL,
	`templateKind` enum('executive_brief','board_deck','client_update') NOT NULL,
	`brandName` varchar(180) NOT NULL,
	`accentColor` varchar(16) NOT NULL,
	`executiveIntro` longtext NOT NULL,
	`includeCitationAppendix` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `client_delivery_templates_id` PRIMARY KEY(`id`),
	CONSTRAINT `client_delivery_templates_org_name_unique` UNIQUE(`organizationId`,`name`)
);
--> statement-breakpoint
CREATE TABLE `organization_integrations` (
	`id` varchar(32) NOT NULL,
	`organizationId` varchar(32) NOT NULL,
	`provider` enum('google_drive','sharepoint','salesforce','hubspot','slack','teams') NOT NULL,
	`status` enum('connection_required','configured','disabled') NOT NULL DEFAULT 'connection_required',
	`displayName` varchar(160) NOT NULL,
	`configurationJson` longtext NOT NULL,
	`configuredByUserId` int NOT NULL,
	`lastValidatedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `organization_integrations_id` PRIMARY KEY(`id`),
	CONSTRAINT `organization_integrations_org_provider_unique` UNIQUE(`organizationId`,`provider`)
);
--> statement-breakpoint
CREATE TABLE `organization_retention_runs` (
	`id` varchar(32) NOT NULL,
	`organizationId` varchar(32) NOT NULL,
	`initiatedByUserId` int NOT NULL,
	`action` enum('preview','execute','scheduled_execute') NOT NULL,
	`status` enum('completed','legal_hold_skipped','failed') NOT NULL,
	`researchAffected` int NOT NULL DEFAULT 0,
	`knowledgeAffected` int NOT NULL DEFAULT 0,
	`auditAffected` int NOT NULL DEFAULT 0,
	`outcomesJson` longtext NOT NULL,
	`completedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `organization_retention_runs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `portfolio_mandate_templates` (
	`id` varchar(32) NOT NULL,
	`organizationId` varchar(32) NOT NULL,
	`createdByUserId` int NOT NULL,
	`name` varchar(160) NOT NULL,
	`description` longtext NOT NULL,
	`defaultPriority` enum('low','standard','high','critical') NOT NULL DEFAULT 'standard',
	`defaultTargetDays` int NOT NULL DEFAULT 30,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `portfolio_mandate_templates_id` PRIMARY KEY(`id`),
	CONSTRAINT `portfolio_mandate_templates_org_name_unique` UNIQUE(`organizationId`,`name`)
);
--> statement-breakpoint
CREATE TABLE `portfolio_signal_alerts` (
	`id` varchar(32) NOT NULL,
	`organizationId` varchar(32) NOT NULL,
	`mandateId` varchar(32),
	`alertType` enum('cross_mandate_risk','evidence_conflict','watchlist_escalation') NOT NULL,
	`status` enum('unread','reviewed','resolved') NOT NULL DEFAULT 'unread',
	`title` varchar(240) NOT NULL,
	`summary` longtext NOT NULL,
	`resourceIdsJson` longtext NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `portfolio_signal_alerts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `client_delivery_snapshots_org_target_idx` ON `client_delivery_snapshots` (`organizationId`,`targetType`,`targetId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `client_delivery_snapshots_org_approved_idx` ON `client_delivery_snapshots` (`organizationId`,`approvedByUserId`,`approvedAt`);--> statement-breakpoint
CREATE INDEX `client_delivery_templates_org_updated_idx` ON `client_delivery_templates` (`organizationId`,`updatedAt`);--> statement-breakpoint
CREATE INDEX `organization_integrations_org_status_idx` ON `organization_integrations` (`organizationId`,`status`,`updatedAt`);--> statement-breakpoint
CREATE INDEX `organization_retention_runs_org_completed_idx` ON `organization_retention_runs` (`organizationId`,`completedAt`);--> statement-breakpoint
CREATE INDEX `organization_retention_runs_org_status_idx` ON `organization_retention_runs` (`organizationId`,`status`,`completedAt`);--> statement-breakpoint
CREATE INDEX `portfolio_mandate_templates_org_updated_idx` ON `portfolio_mandate_templates` (`organizationId`,`updatedAt`);--> statement-breakpoint
CREATE INDEX `portfolio_signal_alerts_org_status_idx` ON `portfolio_signal_alerts` (`organizationId`,`status`,`createdAt`);--> statement-breakpoint
CREATE INDEX `portfolio_signal_alerts_org_mandate_idx` ON `portfolio_signal_alerts` (`organizationId`,`mandateId`,`createdAt`);