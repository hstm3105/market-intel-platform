CREATE TABLE `collaboration_notifications` (
	`id` varchar(32) NOT NULL,
	`organizationId` varchar(32) NOT NULL,
	`userId` int NOT NULL,
	`actorUserId` int NOT NULL,
	`type` enum('mention','review_assigned','review_decision') NOT NULL,
	`targetType` enum('market_scan','knowledge_asset') NOT NULL,
	`targetId` varchar(32) NOT NULL,
	`title` varchar(220) NOT NULL,
	`body` longtext NOT NULL,
	`status` enum('unread','read') NOT NULL DEFAULT 'unread',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`readAt` timestamp,
	CONSTRAINT `collaboration_notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `collaboration_reviews` ADD `dueAt` timestamp;--> statement-breakpoint
CREATE INDEX `collaboration_notifications_org_user_status_idx` ON `collaboration_notifications` (`organizationId`,`userId`,`status`,`createdAt`);--> statement-breakpoint
CREATE INDEX `collaboration_notifications_org_target_idx` ON `collaboration_notifications` (`organizationId`,`targetType`,`targetId`,`createdAt`);