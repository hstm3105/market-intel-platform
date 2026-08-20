CREATE TABLE `chat_messages` (
	`id` varchar(32) NOT NULL,
	`userId` int NOT NULL,
	`scanId` varchar(32) NOT NULL,
	`role` enum('user','assistant') NOT NULL,
	`content` longtext NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `chat_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `competitor_profiles` (
	`id` varchar(32) NOT NULL,
	`userId` int NOT NULL,
	`scanId` varchar(32) NOT NULL,
	`name` varchar(220) NOT NULL,
	`segment` varchar(220) NOT NULL,
	`businessModel` longtext NOT NULL,
	`positioning` longtext NOT NULL,
	`strengthsJson` longtext NOT NULL,
	`weaknessesJson` longtext NOT NULL,
	`recentMovesJson` longtext NOT NULL,
	`strategicSignalsJson` longtext NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `competitor_profiles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `market_scans` (
	`id` varchar(32) NOT NULL,
	`userId` int NOT NULL,
	`industrySlug` varchar(96) NOT NULL,
	`industryName` varchar(120) NOT NULL,
	`projectName` varchar(160),
	`scope` longtext NOT NULL,
	`status` enum('ready','failed') NOT NULL DEFAULT 'ready',
	`executiveSummary` longtext NOT NULL,
	`sourceJson` longtext NOT NULL,
	`analysisJson` longtext NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `market_scans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `research_artifacts` (
	`id` varchar(32) NOT NULL,
	`userId` int NOT NULL,
	`scanId` varchar(32) NOT NULL,
	`type` enum('landscape','brief') NOT NULL,
	`title` varchar(220) NOT NULL,
	`content` longtext NOT NULL,
	`dataJson` longtext NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `research_artifacts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `research_notes` (
	`id` varchar(32) NOT NULL,
	`userId` int NOT NULL,
	`scanId` varchar(32) NOT NULL,
	`title` varchar(220) NOT NULL,
	`content` longtext NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `research_notes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tracked_industries` (
	`id` varchar(32) NOT NULL,
	`userId` int NOT NULL,
	`industrySlug` varchar(96) NOT NULL,
	`industryName` varchar(120) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `tracked_industries_id` PRIMARY KEY(`id`),
	CONSTRAINT `tracked_industries_user_slug_unique` UNIQUE(`userId`,`industrySlug`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `name` longtext;--> statement-breakpoint
CREATE INDEX `chat_messages_user_scan_created_idx` ON `chat_messages` (`userId`,`scanId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `competitor_profiles_scan_idx` ON `competitor_profiles` (`scanId`);--> statement-breakpoint
CREATE INDEX `competitor_profiles_user_idx` ON `competitor_profiles` (`userId`);--> statement-breakpoint
CREATE INDEX `market_scans_user_created_idx` ON `market_scans` (`userId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `market_scans_user_industry_idx` ON `market_scans` (`userId`,`industrySlug`);--> statement-breakpoint
CREATE INDEX `research_artifacts_user_created_idx` ON `research_artifacts` (`userId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `research_artifacts_scan_idx` ON `research_artifacts` (`scanId`);--> statement-breakpoint
CREATE INDEX `research_notes_user_scan_idx` ON `research_notes` (`userId`,`scanId`);--> statement-breakpoint
CREATE INDEX `tracked_industries_user_idx` ON `tracked_industries` (`userId`);