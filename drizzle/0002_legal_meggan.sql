CREATE TABLE `research_projects` (
	`id` varchar(32) NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(160) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `research_projects_id` PRIMARY KEY(`id`),
	CONSTRAINT `research_projects_user_name_unique` UNIQUE(`userId`,`name`)
);
--> statement-breakpoint
ALTER TABLE `market_scans` ADD `projectId` varchar(32);--> statement-breakpoint
CREATE INDEX `research_projects_user_idx` ON `research_projects` (`userId`);