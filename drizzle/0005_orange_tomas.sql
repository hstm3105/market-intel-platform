CREATE TABLE `monitored_industries` (
	`id` varchar(32) NOT NULL,
	`userId` int NOT NULL,
	`organizationId` varchar(32) NOT NULL,
	`industrySlug` varchar(96) NOT NULL,
	`industryName` varchar(120) NOT NULL,
	`scope` longtext NOT NULL,
	`cadence` enum('weekly','monthly') NOT NULL DEFAULT 'weekly',
	`cronExpression` varchar(64) NOT NULL,
	`scheduleCronTaskUid` varchar(65),
	`enabled` boolean NOT NULL DEFAULT true,
	`riskThreshold` enum('all','high') NOT NULL DEFAULT 'all',
	`lastScanId` varchar(32),
	`lastRunAt` timestamp,
	`nextRunAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `monitored_industries_id` PRIMARY KEY(`id`),
	CONSTRAINT `monitored_industries_org_user_slug_unique` UNIQUE(`organizationId`,`userId`,`industrySlug`)
);
--> statement-breakpoint
CREATE TABLE `monitoring_alerts` (
	`id` varchar(32) NOT NULL,
	`userId` int NOT NULL,
	`organizationId` varchar(32) NOT NULL,
	`monitoredIndustryId` varchar(32) NOT NULL,
	`scanId` varchar(32) NOT NULL,
	`category` enum('risk','trend','opportunity','competitor') NOT NULL,
	`severity` enum('high','medium','low') NOT NULL,
	`title` varchar(220) NOT NULL,
	`summary` longtext NOT NULL,
	`evidenceJson` longtext NOT NULL,
	`status` enum('unread','read') NOT NULL DEFAULT 'unread',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `monitoring_alerts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `monitoring_preferences` (
	`id` varchar(32) NOT NULL,
	`userId` int NOT NULL,
	`organizationId` varchar(32) NOT NULL,
	`inAppEnabled` boolean NOT NULL DEFAULT true,
	`dailyDigestEnabled` boolean NOT NULL DEFAULT false,
	`minimumSeverity` enum('all','high') NOT NULL DEFAULT 'all',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `monitoring_preferences_id` PRIMARY KEY(`id`),
	CONSTRAINT `monitoring_preferences_org_user_unique` UNIQUE(`organizationId`,`userId`)
);
--> statement-breakpoint
ALTER TABLE `market_scans` ADD `monitoredIndustryId` varchar(32);--> statement-breakpoint
CREATE INDEX `monitored_industries_schedule_uid_idx` ON `monitored_industries` (`scheduleCronTaskUid`);--> statement-breakpoint
CREATE INDEX `monitored_industries_org_enabled_idx` ON `monitored_industries` (`organizationId`,`enabled`);--> statement-breakpoint
CREATE INDEX `monitoring_alerts_org_user_status_idx` ON `monitoring_alerts` (`organizationId`,`userId`,`status`,`createdAt`);--> statement-breakpoint
CREATE INDEX `monitoring_alerts_monitor_idx` ON `monitoring_alerts` (`monitoredIndustryId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `market_scans_monitor_idx` ON `market_scans` (`monitoredIndustryId`,`createdAt`);