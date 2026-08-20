CREATE TABLE `executive_briefing_settings` (
	`id` varchar(32) NOT NULL,
	`organizationId` varchar(32) NOT NULL,
	`updatedByUserId` int NOT NULL,
	`enabled` boolean NOT NULL DEFAULT false,
	`cadence` enum('weekly','monthly') NOT NULL DEFAULT 'weekly',
	`cronExpression` varchar(80) NOT NULL,
	`scheduleCronTaskUid` varchar(65),
	`approvalRequired` boolean NOT NULL DEFAULT true,
	`lastGeneratedAt` timestamp,
	`nextRunAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `executive_briefing_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `executive_briefing_settings_org_unique` UNIQUE(`organizationId`)
);
--> statement-breakpoint
CREATE TABLE `executive_briefings` (
	`id` varchar(32) NOT NULL,
	`organizationId` varchar(32) NOT NULL,
	`settingId` varchar(32) NOT NULL,
	`generatedByUserId` int NOT NULL,
	`trigger` enum('on_demand','scheduled') NOT NULL,
	`reviewStatus` enum('draft','approved','distributed') NOT NULL DEFAULT 'draft',
	`periodLabel` varchar(120) NOT NULL,
	`title` varchar(240) NOT NULL,
	`contentJson` longtext NOT NULL,
	`citationsJson` longtext NOT NULL,
	`sourceScanIdsJson` longtext NOT NULL,
	`evidenceDigest` varchar(128) NOT NULL,
	`model` varchar(120) NOT NULL,
	`approvedByUserId` int,
	`approvedAt` timestamp,
	`distributedByUserId` int,
	`distributedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `executive_briefings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `executive_briefing_settings_task_idx` ON `executive_briefing_settings` (`scheduleCronTaskUid`);--> statement-breakpoint
CREATE INDEX `executive_briefing_settings_org_enabled_idx` ON `executive_briefing_settings` (`organizationId`,`enabled`,`updatedAt`);--> statement-breakpoint
CREATE INDEX `executive_briefings_org_created_idx` ON `executive_briefings` (`organizationId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `executive_briefings_org_review_idx` ON `executive_briefings` (`organizationId`,`reviewStatus`,`updatedAt`);--> statement-breakpoint
CREATE INDEX `executive_briefings_setting_created_idx` ON `executive_briefings` (`settingId`,`createdAt`);