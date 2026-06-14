CREATE TABLE `gameRecords` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`currentLevel` int NOT NULL DEFAULT 5,
	`totalAttempts` int NOT NULL DEFAULT 0,
	`correctCount` int NOT NULL DEFAULT 0,
	`completed` boolean NOT NULL DEFAULT false,
	`completionTime` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `gameRecords_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `levels` (
	`id` int AUTO_INCREMENT NOT NULL,
	`levelNumber` int NOT NULL,
	`name` varchar(128) NOT NULL,
	`description` text,
	`enabled` boolean NOT NULL DEFAULT true,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `levels_id` PRIMARY KEY(`id`),
	CONSTRAINT `levels_levelNumber_unique` UNIQUE(`levelNumber`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);
--> statement-breakpoint
CREATE TABLE `videos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`levelId` int NOT NULL,
	`title` varchar(256) NOT NULL,
	`videoUrl` text NOT NULL,
	`videoKey` varchar(512) NOT NULL,
	`thumbnailUrl` text,
	`isNormal` boolean NOT NULL DEFAULT false,
	`anomalyDescription` text,
	`enabled` boolean NOT NULL DEFAULT true,
	`duration` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `videos_id` PRIMARY KEY(`id`)
);
