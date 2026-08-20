INSERT INTO `organizations` (`id`, `name`, `ownerUserId`)
SELECT CONCAT('legacy-org-', `id`), CONCAT(SUBSTRING_INDEX(COALESCE(NULLIF(TRIM(`name`), ''), 'My'), ' ', 1), ' Intelligence'), `id`
FROM `users`
WHERE `activeOrganizationId` IS NULL;
--> statement-breakpoint
INSERT INTO `organization_members` (`id`, `organizationId`, `userId`, `role`)
SELECT CONCAT('legacy-member-', `id`), CONCAT('legacy-org-', `id`), `id`, 'owner'
FROM `users`
WHERE `activeOrganizationId` IS NULL;
--> statement-breakpoint
UPDATE `users`
SET `activeOrganizationId` = CONCAT('legacy-org-', `id`)
WHERE `activeOrganizationId` IS NULL;
--> statement-breakpoint
UPDATE `tracked_industries` AS r INNER JOIN `users` AS u ON r.`userId` = u.`id` SET r.`organizationId` = u.`activeOrganizationId` WHERE r.`organizationId` IS NULL;
--> statement-breakpoint
UPDATE `research_projects` AS r INNER JOIN `users` AS u ON r.`userId` = u.`id` SET r.`organizationId` = u.`activeOrganizationId` WHERE r.`organizationId` IS NULL;
--> statement-breakpoint
UPDATE `market_scans` AS r INNER JOIN `users` AS u ON r.`userId` = u.`id` SET r.`organizationId` = u.`activeOrganizationId` WHERE r.`organizationId` IS NULL;
--> statement-breakpoint
UPDATE `research_artifacts` AS r INNER JOIN `users` AS u ON r.`userId` = u.`id` SET r.`organizationId` = u.`activeOrganizationId` WHERE r.`organizationId` IS NULL;
--> statement-breakpoint
UPDATE `competitor_profiles` AS r INNER JOIN `users` AS u ON r.`userId` = u.`id` SET r.`organizationId` = u.`activeOrganizationId` WHERE r.`organizationId` IS NULL;
--> statement-breakpoint
UPDATE `research_notes` AS r INNER JOIN `users` AS u ON r.`userId` = u.`id` SET r.`organizationId` = u.`activeOrganizationId` WHERE r.`organizationId` IS NULL;
--> statement-breakpoint
UPDATE `chat_messages` AS r INNER JOIN `users` AS u ON r.`userId` = u.`id` SET r.`organizationId` = u.`activeOrganizationId` WHERE r.`organizationId` IS NULL;
