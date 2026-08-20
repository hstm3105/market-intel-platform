CREATE TABLE `organization_portfolio_policies` (
	`id` varchar(32) NOT NULL,
	`organizationId` varchar(32) NOT NULL,
	`maxActiveMandates` int NOT NULL DEFAULT 30,
	`requireMandateOwner` boolean NOT NULL DEFAULT true,
	`requireReviewForCritical` boolean NOT NULL DEFAULT true,
	`updatedByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `organization_portfolio_policies_id` PRIMARY KEY(`id`),
	CONSTRAINT `organization_portfolio_policies_org_unique` UNIQUE(`organizationId`)
);
--> statement-breakpoint
CREATE TABLE `portfolio_mandates` (
	`id` varchar(32) NOT NULL,
	`organizationId` varchar(32) NOT NULL,
	`createdByUserId` int NOT NULL,
	`ownerUserId` int NOT NULL,
	`name` varchar(180) NOT NULL,
	`clientLabel` varchar(180) NOT NULL,
	`description` longtext NOT NULL,
	`status` enum('scoping','active','at_risk','complete') NOT NULL,
	`priority` enum('low','standard','high','critical') NOT NULL,
	`targetDate` timestamp,
	`scanIdsJson` longtext NOT NULL,
	`knowledgeAssetIdsJson` longtext NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `portfolio_mandates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `portfolio_watchlists` (
	`id` varchar(32) NOT NULL,
	`organizationId` varchar(32) NOT NULL,
	`mandateId` varchar(32),
	`createdByUserId` int NOT NULL,
	`ownerUserId` int NOT NULL,
	`targetType` enum('industry','company','risk_theme') NOT NULL,
	`label` varchar(180) NOT NULL,
	`rationale` longtext NOT NULL,
	`status` enum('watching','escalated','resolved') NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `portfolio_watchlists_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `portfolio_mandates_org_status_idx` ON `portfolio_mandates` (`organizationId`,`status`,`updatedAt`);--> statement-breakpoint
CREATE INDEX `portfolio_mandates_org_owner_idx` ON `portfolio_mandates` (`organizationId`,`ownerUserId`,`updatedAt`);--> statement-breakpoint
CREATE INDEX `portfolio_mandates_org_updated_idx` ON `portfolio_mandates` (`organizationId`,`updatedAt`);--> statement-breakpoint
CREATE INDEX `portfolio_watchlists_org_status_idx` ON `portfolio_watchlists` (`organizationId`,`status`,`updatedAt`);--> statement-breakpoint
CREATE INDEX `portfolio_watchlists_org_mandate_idx` ON `portfolio_watchlists` (`organizationId`,`mandateId`,`updatedAt`);--> statement-breakpoint
CREATE INDEX `portfolio_watchlists_org_owner_idx` ON `portfolio_watchlists` (`organizationId`,`ownerUserId`,`updatedAt`);