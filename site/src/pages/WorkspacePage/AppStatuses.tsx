import type { Theme } from "@emotion/react";
import { useTheme } from "@emotion/react";
import AppsIcon from "@mui/icons-material/Apps";
import InsertDriveFile from "@mui/icons-material/InsertDriveFile";
import CircularProgress from "@mui/material/CircularProgress";
import Link from "@mui/material/Link";
import Tooltip from "@mui/material/Tooltip";
import type {
	WorkspaceAppStatus as APIWorkspaceAppStatus,
	Workspace,
	WorkspaceAgent,
	WorkspaceApp,
} from "api/typesGenerated";
import { formatDistance, formatDistanceToNow } from "date-fns";
import { CircleCheckIcon } from "lucide-react";
import { CircleAlertIcon } from "lucide-react";
import { TriangleAlertIcon } from "lucide-react";
import { ExternalLinkIcon } from "lucide-react";
import { HourglassIcon } from "lucide-react";
import { CircleHelpIcon } from "lucide-react";
import { useAppLink } from "modules/apps/useAppLink";
import type { FC } from "react";

const getStatusColor = (
	theme: Theme,
	state: APIWorkspaceAppStatus["state"],
) => {
	switch (state) {
		case "complete":
			return theme.palette.success.main;
		case "failure":
			return theme.palette.error.main;
		case "working":
			return theme.palette.primary.main;
		default:
			// Assuming unknown state maps to warning/secondary visually
			return theme.palette.text.secondary;
	}
};

const getStatusIcon = (
	theme: Theme,
	state: APIWorkspaceAppStatus["state"],
	isLatest: boolean,
) => {
	// Determine color: Use state color if latest, otherwise use disabled text color (grey)
	const color = isLatest
		? getStatusColor(theme, state)
		: theme.palette.text.disabled;
	switch (state) {
		case "complete":
			return <CircleCheckIcon className="size-icon-sm" style={{ color }} />;
		case "failure":
			return <CircleAlertIcon className="size-icon-sm" style={{ color }} />;
		case "working":
			// Use Hourglass for past "working" states, spinner for the current one
			return isLatest ? (
				<CircularProgress size={18} sx={{ color }} />
			) : (
				<HourglassIcon className="size-icon-sm" style={{ color }} />
			);
		default:
			return <TriangleAlertIcon className="size-icon-sm" style={{ color }} />;
	}
};

const commonStyles = {
	fontSize: "12px",
	lineHeight: "15px",
	color: "text.disabled",
	display: "inline-flex",
	alignItems: "center",
	gap: 0.5,
	px: 0.75,
	py: 0.25,
	borderRadius: "6px",
	bgcolor: "transparent",
	minWidth: 0,
	maxWidth: "fit-content",
	overflow: "hidden",
	textOverflow: "ellipsis",
	whiteSpace: "nowrap",
	textDecoration: "none",
	transition: "all 0.15s ease-in-out",
	"&:hover": {
		textDecoration: "none",
		bgcolor: "action.hover",
		color: "text.secondary",
	},
	"& .MuiSvgIcon-root": {
		// Consistent icon styling within links
		fontSize: 11,
		opacity: 0.7,
		mt: "-1px", // Slight vertical alignment adjustment
		flexShrink: 0,
	},
};

const formatURI = (uri: string) => {
	if (uri.startsWith("file://")) {
		const path = uri.slice(7);
		// Slightly shorter truncation for this context if needed
		if (path.length > 35) {
			const start = path.slice(0, 15);
			const end = path.slice(-15);
			return `${start}...${end}`;
		}
		return path;
	}

	try {
		const url = new URL(uri);
		const fullUrl = url.toString();
		// Slightly shorter truncation
		if (fullUrl.length > 40) {
			const start = fullUrl.slice(0, 20);
			const end = fullUrl.slice(-20);
			return `${start}...${end}`;
		}
		return fullUrl;
	} catch {
		// Slightly shorter truncation
		if (uri.length > 35) {
			const start = uri.slice(0, 15);
			const end = uri.slice(-15);
			return `${start}...${end}`;
		}
		return uri;
	}
};

// --- Component Implementation ---

export interface AppStatusesProps {
	apps: WorkspaceApp[];
	workspace: Workspace;
	agents: ReadonlyArray<WorkspaceAgent>;
	/** Optional reference date for calculating relative time. Defaults to Date.now(). Useful for Storybook. */
	referenceDate?: Date;
}

// Extend the API status type to include the app icon and the app itself
interface StatusWithAppInfo extends APIWorkspaceAppStatus {
	appIcon?: string; // Kept for potential future use, but we'll primarily use app.icon
	app?: WorkspaceApp; // Store the full app object
}

export const AppStatuses: FC<AppStatusesProps> = ({
	apps,
	workspace,
	agents,
	referenceDate,
}) => {
	const theme = useTheme();

	// 1. Flatten all statuses and include the parent app object
	const allStatuses: StatusWithAppInfo[] = apps.flatMap((app) =>
		app.statuses.map((status) => ({
			...status,
			app: app, // Store the parent app object
		})),
	);

	// 2. Sort statuses chronologically (newest first) - mutating the value is
	// fine since it's not an outside parameter
	allStatuses.sort(
		(a, b) =>
			new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
	);

	// Determine the reference point for time calculation
	const comparisonDate = referenceDate ?? new Date();

	if (allStatuses.length === 0) {
		return null;
	}

	return (
		<div
			css={{ display: "flex", flexDirection: "column", gap: 16, padding: 16 }}
		>
			{allStatuses.map((status, index) => {
				const isLatest = index === 0;
				const isFileURI = status.uri?.startsWith("file://");
				const statusTime = new Date(status.created_at);
				// Use formatDistance if referenceDate is provided, otherwise formatDistanceToNow
				const formattedTimestamp = referenceDate
					? formatDistance(statusTime, comparisonDate, { addSuffix: true })
					: formatDistanceToNow(statusTime, { addSuffix: true });

				// Get the associated app for this status
				const currentApp = status.app;
				const agent = agents.find((agent) => agent.id === status.agent_id);

				// Determine if app link should be shown
				const showAppLink =
					isLatest ||
					(index > 0 && status.app_id !== allStatuses[index - 1].app_id);

				return (
					<div
						key={status.id}
						css={{
							display: "flex",
							alignItems: "flex-start", // Align icon with the first line of text
							gap: 12,
							backgroundColor: theme.palette.background.paper,
							borderRadius: 8,
							padding: 12,
							opacity: isLatest ? 1 : 0.65, // Apply opacity if not the latest
							transition: "opacity 0.15s ease-in-out", // Add smooth transition
							"&:hover": {
								opacity: 1, // Restore opacity on hover for older items
							},
						}}
					>
						{/* Icon Column */}
						<div
							css={{
								flexShrink: 0,
								marginTop: 2,
								display: "flex",
								alignItems: "center",
							}}
						>
							{getStatusIcon(theme, status.state, isLatest) || (
								<CircleHelpIcon
									className="size-icon-sm"
									css={{ color: theme.palette.text.disabled }}
								/>
							)}
						</div>

						{/* Content Column */}
						<div
							css={{
								display: "flex",
								flexDirection: "column",
								gap: 4,
								minWidth: 0,
								flex: 1,
							}}
						>
							{/* Message */}
							<div
								css={{
									fontSize: 14,
									lineHeight: "20px",
									color: theme.palette.text.primary,
									fontWeight: 500,
								}}
							>
								{status.message}
							</div>

							{/* Links Row */}
							<div
								css={{
									display: "flex",
									flexDirection: "column",
									alignItems: "flex-start",
									gap: 4,
									marginTop: 4,
									minWidth: 0,
								}}
							>
								{/* Conditional App Link */}
								{currentApp && agent && showAppLink && (
									<AppLink
										app={currentApp}
										agent={agent}
										workspace={workspace}
									/>
								)}

								{/* Existing URI Link */}
								{status.uri && (
									<div css={{ display: "flex", minWidth: 0, width: "100%" }}>
										{isFileURI ? (
											<Tooltip title="This file is located in your workspace">
												<div
													css={{
														...commonStyles,
														"&:hover": {
															bgcolor: "action.hover",
															color: "text.secondary",
														},
													}}
												>
													<InsertDriveFile sx={{ mr: 0.5 }} />
													{formatURI(status.uri)}
												</div>
											</Tooltip>
										) : (
											<Link
												href={status.uri}
												target="_blank"
												rel="noopener"
												sx={{
													...commonStyles,
													"&:hover": {
														...commonStyles["&:hover"],
														color: "text.primary", // Keep hover color
													},
												}}
											>
												<ExternalLinkIcon
													className="size-icon-xs"
													style={{ marginRight: "4px" }}
												/>
												<div
													css={{
														bgcolor: "transparent",
														padding: 0,
														color: "inherit",
														fontSize: "inherit",
														lineHeight: "inherit",
														overflow: "hidden",
														textOverflow: "ellipsis",
														whiteSpace: "nowrap",
														flexShrink: 1, // Allow text to shrink
													}}
												>
													{formatURI(status.uri)}
												</div>
											</Link>
										)}
									</div>
								)}
							</div>

							{/* Timestamp */}
							<div
								css={{
									fontSize: 12,
									color: theme.palette.text.secondary,
									marginTop: 2,
								}}
							>
								{formattedTimestamp}
							</div>
						</div>
					</div>
				);
			})}
		</div>
	);
};

type AppLinkProps = {
	app: WorkspaceApp;
	agent: WorkspaceAgent;
	workspace: Workspace;
};

const AppLink: FC<AppLinkProps> = ({ app, agent, workspace }) => {
	const link = useAppLink(app, { agent, workspace });
	const theme = useTheme();

	return (
		<Tooltip title={`Open ${link.label}`} placement="top">
			<Link
				href={link.href}
				onClick={link.onClick}
				target="_blank"
				rel="noopener"
				sx={{
					...commonStyles,
					position: "relative",
					"& .MuiSvgIcon-root": {
						fontSize: 14,
						opacity: 0.7,
						mr: 0.5,
					},
					"& img": {
						opacity: 0.8,
						marginRight: 0.5,
					},
					"&:hover": {
						...commonStyles["&:hover"],
						color: theme.palette.text.primary, // Keep consistent hover color
						"& img": {
							opacity: 1,
						},
						"& .MuiSvgIcon-root": {
							opacity: 1,
						},
					},
				}}
			>
				{app.icon ? (
					<img
						src={app.icon}
						alt={`${link.label} icon`}
						width={14}
						height={14}
						style={{ borderRadius: "3px" }}
					/>
				) : (
					<AppsIcon />
				)}
				{/* Keep app name short */}
				<span
					css={{
						lineHeight: 1,
						textOverflow: "ellipsis",
						overflow: "hidden",
						whiteSpace: "nowrap",
					}}
				>
					{link.label}
				</span>
			</Link>
		</Tooltip>
	);
};
