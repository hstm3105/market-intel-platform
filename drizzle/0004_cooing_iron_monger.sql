CREATE TABLE `organization_members` (
	`id` varchar(32) NOT NULL,
	`organizationId` varchar(32) NOT NULL,
	`userId` int NOT NULL,
	`role` enum('owner','admin','research_lead','analyst','viewer') NOT NULL DEFAULT 'analyst',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `organization_members_id` PRIMARY KEY(`id`),
	CONSTRAINT `organization_members_org_user_unique` UNIQUE(`organizationId`,`userId`)
);
--> statement-breakpoint
CREATE TABLE `organizations` (
	`id` varchar(32) NOT NULL,
	`name` varchar(160) NOT NULL,
	`ownerUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `organizations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `chat_messages` ADD `organizationId` varchar(32);--> statement-breakpoint
ALTER TABLE `competitor_profiles` ADD `organizationId` varchar(32);--> statement-breakpoint
ALTER TABLE `market_scans` ADD `organizationId` varchar(32);--> statement-breakpoint
ALTER TABLE `research_artifacts` ADD `organizationId` varchar(32);--> statement-breakpoint
ALTER TABLE `research_notes` ADD `organizationId` varchar(32);--> statement-breakpoint
ALTER TABLE `research_projects` ADD `organizationId` varchar(32);--> statement-breakpoint
ALTER TABLE `tracked_industries` ADD `organizationId` varchar(32);--> statement-breakpoint
ALTER TABLE `users` ADD `activeOrganizationId` varchar(32);--> statement-breakpoint
CREATE INDEX `organization_members_user_idx` ON `organization_members` (`userId`);--> statement-breakpoint
CREATE INDEX `organizations_owner_idx` ON `organizations` (`ownerUserId`);--> statement-breakpoint
CREATE INDEX `chat_messages_organization_idx` ON `chat_messages` (`organizationId`);--> statement-breakpoint
CREATE INDEX `competitor_profiles_organization_idx` ON `competitor_profiles` (`organizationId`);--> statement-breakpoint
CREATE INDEX `market_scans_organization_created_idx` ON `market_scans` (`organizationId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `research_artifacts_organization_idx` ON `research_artifacts` (`organizationId`);--> statement-breakpoint
CREATE INDEX `research_notes_organization_idx` ON `research_notes` (`organizationId`);--> statement-breakpoint
CREATE INDEX `research_projects_organization_idx` ON `research_projects` (`organizationId`);--> statement-breakpoint
CREATE INDEX `tracked_industries_organization_idx` ON `tracked_industries` (`organizationId`);