CREATE TABLE `knowledge_assets` (
	`id` varchar(32) NOT NULL,
	`userId` int NOT NULL,
	`organizationId` varchar(32) NOT NULL,
	`collectionId` varchar(32),
	`kind` enum('insight','brief','decision_note') NOT NULL,
	`status` enum('draft','published') NOT NULL DEFAULT 'draft',
	`title` varchar(220) NOT NULL,
	`content` longtext NOT NULL,
	`tagsJson` longtext NOT NULL,
	`scanIdsJson` longtext NOT NULL,
	`sourceRefsJson` longtext NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `knowledge_assets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `knowledge_collections` (
	`id` varchar(32) NOT NULL,
	`userId` int NOT NULL,
	`organizationId` varchar(32) NOT NULL,
	`name` varchar(160) NOT NULL,
	`description` longtext NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `knowledge_collections_id` PRIMARY KEY(`id`),
	CONSTRAINT `knowledge_collections_org_name_unique` UNIQUE(`organizationId`,`name`)
);
--> statement-breakpoint
CREATE TABLE `portfolio_views` (
	`id` varchar(32) NOT NULL,
	`userId` int NOT NULL,
	`organizationId` varchar(32) NOT NULL,
	`name` varchar(160) NOT NULL,
	`scanIdsJson` longtext NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `portfolio_views_id` PRIMARY KEY(`id`),
	CONSTRAINT `portfolio_views_org_name_unique` UNIQUE(`organizationId`,`name`)
);
--> statement-breakpoint
CREATE INDEX `knowledge_assets_org_updated_idx` ON `knowledge_assets` (`organizationId`,`updatedAt`);--> statement-breakpoint
CREATE INDEX `knowledge_assets_collection_idx` ON `knowledge_assets` (`collectionId`,`updatedAt`);--> statement-breakpoint
CREATE INDEX `knowledge_assets_org_status_idx` ON `knowledge_assets` (`organizationId`,`status`);--> statement-breakpoint
CREATE INDEX `knowledge_collections_org_updated_idx` ON `knowledge_collections` (`organizationId`,`updatedAt`);--> statement-breakpoint
CREATE INDEX `portfolio_views_org_updated_idx` ON `portfolio_views` (`organizationId`,`updatedAt`);