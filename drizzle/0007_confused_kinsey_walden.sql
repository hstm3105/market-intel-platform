CREATE TABLE `organization_audit_events` (
	`id` varchar(32) NOT NULL,
	`organizationId` varchar(32) NOT NULL,
	`actorUserId` int NOT NULL,
	`eventType` varchar(96) NOT NULL,
	`resourceType` varchar(64) NOT NULL,
	`resourceId` varchar(40),
	`metadataJson` longtext NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `organization_audit_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `organization_retention_policies` (
	`id` varchar(32) NOT NULL,
	`organizationId` varchar(32) NOT NULL,
	`researchRetentionDays` int NOT NULL DEFAULT 730,
	`knowledgeRetentionDays` int NOT NULL DEFAULT 1095,
	`auditRetentionDays` int NOT NULL DEFAULT 1095,
	`legalHoldEnabled` boolean NOT NULL DEFAULT false,
	`updatedByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `organization_retention_policies_id` PRIMARY KEY(`id`),
	CONSTRAINT `organization_retention_policy_org_unique` UNIQUE(`organizationId`)
);
--> statement-breakpoint
CREATE INDEX `organization_audit_events_org_created_idx` ON `organization_audit_events` (`organizationId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `organization_audit_events_org_actor_idx` ON `organization_audit_events` (`organizationId`,`actorUserId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `organization_audit_events_org_type_idx` ON `organization_audit_events` (`organizationId`,`eventType`,`createdAt`);