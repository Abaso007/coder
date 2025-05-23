import { useTheme } from "@emotion/react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import type { FC, HTMLAttributes } from "react";
import { cn } from "utils/cn";

dayjs.extend(relativeTime);

interface LastSeenProps
	extends Omit<HTMLAttributes<HTMLSpanElement>, "children"> {
	at: dayjs.ConfigType;
	"data-chromatic"?: string; // prevents a type error in the stories
}

export const LastSeen: FC<LastSeenProps> = ({ at, className, ...attrs }) => {
	const theme = useTheme();
	const t = dayjs(at);
	const now = dayjs();

	let message = t.fromNow();
	let color = theme.palette.text.secondary;

	if (t.isAfter(now.subtract(1, "hour"))) {
		// Since the agent reports on a 10m interval,
		// the last_used_at can be inaccurate when recent.
		message = "Now";
		color = theme.roles.success.fill.solid;
	} else if (t.isAfter(now.subtract(3, "day"))) {
		color = theme.experimental.l2.text;
	} else if (t.isAfter(now.subtract(1, "month"))) {
		color = theme.roles.warning.fill.solid;
	} else if (t.isAfter(now.subtract(100, "year"))) {
		color = theme.roles.error.fill.solid;
	} else {
		message = "Never";
	}

	return (
		<span
			data-chromatic="ignore"
			css={{ color }}
			{...attrs}
			className={cn(["whitespace-nowrap", className])}
		>
			{message}
		</span>
	);
};
