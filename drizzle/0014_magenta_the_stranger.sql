CREATE TABLE `executive_briefing_deliveries` (
	`id` varchar(32) NOT NULL,
	`organizationId` varchar(32) NOT NULL,
	`briefingId` varchar(32) NOT NULL,
	`requestedByUserId` int NOT NULL,
	`destination` enum('gmail','google_docs','google_sheets') NOT NULL,
	`status` enum('created','sent','failed') NOT NULL,
	`recipientJson` longtext NOT NULL,
	`externalFileId` varchar(160),
	`externalUrl` varchar(1024),
	`contentDigest` varchar(128) NOT NULL,
	`errorCode` varchar(120),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `executive_briefing_deliveries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `executive_briefing_deliveries_org_briefing_created_idx` ON `executive_briefing_deliveries` (`organizationId`,`briefingId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `executive_briefing_deliveries_org_destination_created_idx` ON `executive_briefing_deliveries` (`organizationId`,`destination`,`createdAt`);