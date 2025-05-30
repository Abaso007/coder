import type { Interpolation, Theme } from "@emotion/react";
import { workspaceResolveAutostart } from "api/queries/workspaceQuota";
import type {
	Template,
	TemplateVersion,
	Workspace,
	WorkspaceBuild,
} from "api/typesGenerated";
import { MemoizedInlineMarkdown } from "components/Markdown/Markdown";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { TriangleAlertIcon } from "lucide-react";
import { InfoIcon } from "lucide-react";
import { useDashboard } from "modules/dashboard/useDashboard";
import { TemplateUpdateMessage } from "modules/templates/TemplateUpdateMessage";
import { type FC, useEffect, useState } from "react";

dayjs.extend(relativeTime);
import { useQuery } from "react-query";
import type { WorkspacePermissions } from "../../../modules/workspaces/permissions";
import {
	NotificationActionButton,
	type NotificationItem,
	Notifications,
} from "./Notifications";

type WorkspaceNotificationsProps = {
	workspace: Workspace;
	template: Template;
	permissions: WorkspacePermissions;
	onRestartWorkspace: () => void;
	onUpdateWorkspace: () => void;
	onActivateWorkspace: () => void;
	latestVersion?: TemplateVersion;
};

export const WorkspaceNotifications: FC<WorkspaceNotificationsProps> = ({
	workspace,
	template,
	latestVersion,
	permissions,
	onRestartWorkspace,
	onUpdateWorkspace,
	onActivateWorkspace,
}) => {
	const notifications: NotificationItem[] = [];

	// Outdated
	const canAutostartQuery = useQuery(workspaceResolveAutostart(workspace.id));
	const isParameterMismatch =
		canAutostartQuery.data?.parameter_mismatch ?? false;
	const canAutostart = !isParameterMismatch;
	const updateRequired =
		(workspace.template_require_active_version ||
			workspace.automatic_updates === "always") &&
		workspace.outdated;
	const autoStartFailing = workspace.autostart_schedule && !canAutostart;
	const requiresManualUpdate = updateRequired && autoStartFailing;

	if (workspace.outdated && latestVersion) {
		const actions = (
			<NotificationActionButton onClick={onUpdateWorkspace}>
				Update
			</NotificationActionButton>
		);
		if (requiresManualUpdate) {
			notifications.push({
				title: "Autostart has been disabled for your workspace.",
				severity: "warning",
				detail:
					"Autostart is unable to automatically update your workspace. Manually update your workspace to reenable Autostart.",

				actions,
			});
		} else {
			notifications.push({
				title: "An update is available for your workspace",
				severity: "info",
				detail: (
					<TemplateUpdateMessage>{latestVersion.message}</TemplateUpdateMessage>
				),
				actions,
			});
		}
	}

	// Unhealthy
	if (
		workspace.latest_build.status === "running" &&
		!workspace.health.healthy
	) {
		const troubleshootingURL = findTroubleshootingURL(workspace.latest_build);
		const hasActions = permissions.updateWorkspace || troubleshootingURL;

		notifications.push({
			title: "Workspace is unhealthy",
			severity: "warning",
			detail: (
				<>
					Your workspace is running but{" "}
					{workspace.health.failing_agents.length > 1
						? `${workspace.health.failing_agents.length} agents are unhealthy`
						: "1 agent is unhealthy"}
					.
				</>
			),
			actions: hasActions ? (
				<>
					{permissions.updateWorkspace && (
						<NotificationActionButton onClick={onRestartWorkspace}>
							Restart
						</NotificationActionButton>
					)}
					{troubleshootingURL && (
						<NotificationActionButton
							onClick={() => window.open(troubleshootingURL, "_blank")}
						>
							Troubleshooting
						</NotificationActionButton>
					)}
				</>
			) : undefined,
		});
	}

	// Dormant
	const { entitlements } = useDashboard();
	const advancedSchedulingEnabled =
		entitlements.features.advanced_template_scheduling.enabled;
	if (advancedSchedulingEnabled && workspace.dormant_at) {
		const formatDate = (dateStr: string, timestamp: boolean): string => {
			const date = new Date(dateStr);
			return date.toLocaleDateString(undefined, {
				month: "long",
				day: "numeric",
				year: "numeric",
				...(timestamp ? { hour: "numeric", minute: "numeric" } : {}),
			});
		};
		const actions = (
			<NotificationActionButton onClick={onActivateWorkspace}>
				Activate
			</NotificationActionButton>
		);
		notifications.push({
			actions,
			title: "Workspace is dormant",
			severity: "warning",
			detail: workspace.deleting_at ? (
				<>
					This workspace has not been used for{" "}
					{dayjs(workspace.last_used_at).fromNow(true)} and was marked dormant
					on {formatDate(workspace.dormant_at, false)}. It is scheduled to be
					deleted on {formatDate(workspace.deleting_at, true)}. To keep it you
					must activate the workspace.
				</>
			) : (
				<>
					This workspace has not been used for{" "}
					{dayjs(workspace.last_used_at).fromNow(true)} and was marked dormant
					on {formatDate(workspace.dormant_at, false)}. It is not scheduled for
					auto-deletion but will become a candidate if auto-deletion is enabled
					on this template. To keep it you must activate the workspace.
				</>
			),
		});
	}

	// Pending in Queue
	const [showAlertPendingInQueue, setShowAlertPendingInQueue] = useState(false);
	// 2023-11-15 - MES - This effect will be called every single render because
	// "now" will always change and invalidate the dependency array. Need to
	// figure out if this effect really should run every render (possibly meaning
	// no dependency array at all), or how to get the array stabilized (ideal)
	const now = dayjs();
	// biome-ignore lint/correctness/useExhaustiveDependencies: consider refactoring
	useEffect(() => {
		if (
			workspace.latest_build.status !== "pending" ||
			workspace.latest_build.job.queue_size === 0
		) {
			if (!showAlertPendingInQueue) {
				return;
			}

			const hideTimer = setTimeout(() => {
				setShowAlertPendingInQueue(false);
			}, 250);
			return () => {
				clearTimeout(hideTimer);
			};
		}

		const t = Math.max(
			0,
			5000 - dayjs().diff(dayjs(workspace.latest_build.created_at)),
		);
		const showTimer = setTimeout(() => {
			setShowAlertPendingInQueue(true);
		}, t);

		return () => {
			clearTimeout(showTimer);
		};
	}, [workspace, now, showAlertPendingInQueue]);

	if (showAlertPendingInQueue) {
		notifications.push({
			title: "Workspace build is pending",
			severity: "info",
			detail: (
				<>
					This workspace build job is waiting for a provisioner to become
					available. If you have been waiting for an extended period of time,
					please contact your administrator for assistance.
					<span css={{ display: "block", marginTop: 12 }}>
						Position in queue:{" "}
						<strong>{workspace.latest_build.job.queue_position}</strong>
					</span>
				</>
			),
		});
	}

	// Deprecated
	if (template.deprecated) {
		notifications.push({
			title: "This workspace uses a deprecated template",
			severity: "warning",
			detail: (
				<MemoizedInlineMarkdown>
					{template.deprecation_message}
				</MemoizedInlineMarkdown>
			),
		});
	}

	const infoNotifications = notifications.filter((n) => n.severity === "info");
	const warningNotifications = notifications.filter(
		(n) => n.severity === "warning",
	);

	// We have to avoid rendering out a div at all if there is no content so
	// that we don't introduce additional gaps via the parent flex container
	if (infoNotifications.length === 0 && warningNotifications.length === 0) {
		return null;
	}

	return (
		<div css={styles.notificationsGroup}>
			{infoNotifications.length > 0 && (
				<Notifications
					items={infoNotifications}
					severity="info"
					icon={<InfoIcon aria-hidden="true" className="size-icon-sm" />}
				/>
			)}

			{warningNotifications.length > 0 && (
				<Notifications
					items={warningNotifications}
					severity="warning"
					icon={<TriangleAlertIcon className="size-icon-sm" />}
				/>
			)}
		</div>
	);
};

const styles = {
	notificationsGroup: {
		display: "flex",
		alignItems: "center",
		gap: 12,
	},
} satisfies Record<string, Interpolation<Theme>>;

const findTroubleshootingURL = (
	workspaceBuild: WorkspaceBuild,
): string | undefined => {
	for (const resource of workspaceBuild.resources) {
		if (resource.agents) {
			for (const agent of resource.agents) {
				if (agent.troubleshooting_url) {
					return agent.troubleshooting_url;
				}
			}
		}
	}
	return undefined;
};
