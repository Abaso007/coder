import { API } from "api/api";
import type { OrganizationSyncSettings } from "api/typesGenerated";
import type { QueryClient } from "react-query";

const getOrganizationIdpSyncSettingsKey = () => ["organizationIdpSyncSettings"];

export const patchOrganizationSyncSettings = (queryClient: QueryClient) => {
	return {
		mutationFn: (request: OrganizationSyncSettings) =>
			API.patchOrganizationIdpSyncSettings(request),
		onSuccess: async () =>
			await queryClient.invalidateQueries({
				queryKey: getOrganizationIdpSyncSettingsKey(),
			}),
	};
};

export const organizationIdpSyncSettings = (isIdpSyncEnabled: boolean) => {
	return {
		queryKey: getOrganizationIdpSyncSettingsKey(),
		queryFn: () => API.getOrganizationIdpSyncSettings(),
		enabled: isIdpSyncEnabled,
	};
};
