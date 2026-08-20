CREATE TABLE `collaboration_comments` (
	`id` varchar(32) NOT NULL,
	`organizationId` varchar(32) NOT NULL,
	`targetType` enum('market_scan','knowledge_asset') NOT NULL,
	`targetId` varchar(32) NOT NULL,
	`authorUserId` int NOT NULL,
	`body` longtext NOT NULL,
	`mentionedUserIdsJson` longtext NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `collaboration_comments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `collaboration_reviews` (
	`id` varchar(32) NOT NULL,
	`organizationId` varchar(32) NOT NULL,
	`targetType` enum('market_scan','knowledge_asset') NOT NULL,
	`targetId` varchar(32) NOT NULL,
	`status` enum('draft','in_review','changes_requested','approved') NOT NULL DEFAULT 'draft',
	`requestedByUserId` int NOT NULL,
	`reviewerUserId` int,
	`decisionByUserId` int,
	`decisionNote` longtext NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `collaboration_reviews_id` PRIMARY KEY(`id`),
	CONSTRAINT `collaboration_reviews_org_target_unique` UNIQUE(`organizationId`,`targetType`,`targetId`)
);
--> statement-breakpoint
CREATE INDEX `collaboration_comments_org_target_created_idx` ON `collaboration_comments` (`organizationId`,`targetType`,`targetId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `collaboration_comments_org_author_created_idx` ON `collaboration_comments` (`organizationId`,`authorUserId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `collaboration_reviews_org_status_updated_idx` ON `collaboration_reviews` (`organizationId`,`status`,`updatedAt`);--> statement-breakpoint
CREATE INDEX `collaboration_reviews_org_reviewer_status_idx` ON `collaboration_reviews` (`organizationId`,`reviewerUserId`,`status`);