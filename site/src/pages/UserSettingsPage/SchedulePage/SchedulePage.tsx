import {
	updateUserQuietHoursSchedule,
	userQuietHoursSchedule,
} from "api/queries/settings";
import type { UserQuietHoursScheduleResponse } from "api/typesGenerated";
import { ErrorAlert } from "components/Alert/ErrorAlert";
import { displaySuccess } from "components/GlobalSnackbar/utils";
import { Loader } from "components/Loader/Loader";
import { useAuthenticated } from "hooks";
import type { FC } from "react";
import { useMutation, useQuery, useQueryClient } from "react-query";
import { Section } from "../Section";
import { ScheduleForm } from "./ScheduleForm";

const SchedulePage: FC = () => {
	const { user: me } = useAuthenticated();
	const queryClient = useQueryClient();

	const {
		data: quietHoursSchedule,
		error,
		isLoading,
		isError,
	} = useQuery(userQuietHoursSchedule(me.id));

	const {
		mutate: onSubmit,
		error: submitError,
		isPending: mutationLoading,
	} = useMutation(updateUserQuietHoursSchedule(me.id, queryClient));

	if (isLoading) {
		return <Loader />;
	}

	if (isError) {
		return <ErrorAlert error={error} />;
	}

	return (
		<Section
			title="Quiet hours"
			layout="fluid"
			description="Workspaces may be automatically updated during your quiet hours, as configured by your administrators."
		>
			<ScheduleForm
				isLoading={mutationLoading}
				initialValues={quietHoursSchedule as UserQuietHoursScheduleResponse}
				submitError={submitError}
				onSubmit={(values) => {
					onSubmit(values, {
						onSuccess: () => {
							displaySuccess("Schedule updated successfully");
						},
					});
				}}
			/>
		</Section>
	);
};

export default SchedulePage;
