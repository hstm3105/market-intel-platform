CREATE TABLE `research_agent_runs` (
	`id` varchar(32) NOT NULL,
	`organizationId` varchar(32) NOT NULL,
	`requestedByUserId` int NOT NULL,
	`scanIdsJson` longtext NOT NULL,
	`question` longtext NOT NULL,
	`model` varchar(96) NOT NULL,
	`status` enum('completed','failed') NOT NULL,
	`synthesis` longtext NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `research_agent_runs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `source_evidence_claims` (
	`id` varchar(32) NOT NULL,
	`organizationId` varchar(32) NOT NULL,
	`agentRunId` varchar(32) NOT NULL,
	`scanId` varchar(32) NOT NULL,
	`claim` longtext NOT NULL,
	`assessment` enum('corroborated','supported','conflicted','insufficient') NOT NULL,
	`confidence` int NOT NULL,
	`sourceIdsJson` longtext NOT NULL,
	`counterSourceIdsJson` longtext NOT NULL,
	`rationale` longtext NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `source_evidence_claims_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `research_agent_runs_org_created_idx` ON `research_agent_runs` (`organizationId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `research_agent_runs_org_requester_idx` ON `research_agent_runs` (`organizationId`,`requestedByUserId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `source_evidence_claims_org_run_idx` ON `source_evidence_claims` (`organizationId`,`agentRunId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `source_evidence_claims_org_scan_idx` ON `source_evidence_claims` (`organizationId`,`scanId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `source_evidence_claims_org_assessment_idx` ON `source_evidence_claims` (`organizationId`,`assessment`,`createdAt`);