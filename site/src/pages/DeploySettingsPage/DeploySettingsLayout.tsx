import { createContext, type FC, Suspense, useContext } from "react";
import { useQuery } from "react-query";
import { Outlet } from "react-router-dom";
import type { DeploymentConfig } from "api/api";
import { deploymentConfig } from "api/queries/deployment";
import { Loader } from "components/Loader/Loader";
import { Margins } from "components/Margins/Margins";
import { Stack } from "components/Stack/Stack";
import { useAuthenticated } from "contexts/auth/RequireAuth";
import { RequirePermission } from "contexts/auth/RequirePermission";
import { useDashboard } from "modules/dashboard/useDashboard";
import { ManagementSettingsLayout } from "pages/ManagementSettingsPage/ManagementSettingsLayout";
import { Sidebar } from "./Sidebar";

type DeploySettingsContextValue = {
  deploymentValues: DeploymentConfig;
};

export const DeploySettingsContext = createContext<
  DeploySettingsContextValue | undefined
>(undefined);

export const useDeploySettings = (): DeploySettingsContextValue => {
  const context = useContext(DeploySettingsContext);
  if (!context) {
    throw new Error(
      "useDeploySettings should be used inside of DeploySettingsLayout",
    );
  }
  return context;
};

export const DeploySettingsLayout: FC = () => {
  const { experiments } = useDashboard();

  const multiOrgExperimentEnabled = experiments.includes("multi-organization");

  return multiOrgExperimentEnabled ? (
    <ManagementSettingsLayout />
  ) : (
    <DeploySettingsLayoutInner />
  );
};

const DeploySettingsLayoutInner: FC = () => {
  const deploymentConfigQuery = useQuery(deploymentConfig());
  const { permissions } = useAuthenticated();

  return (
    <RequirePermission isFeatureVisible={permissions.viewDeploymentValues}>
      <Margins>
        <Stack css={{ padding: "48px 0" }} direction="row" spacing={6}>
          <Sidebar />
          <main css={{ maxWidth: 800, width: "100%" }}>
            {deploymentConfigQuery.data ? (
              <DeploySettingsContext.Provider
                value={{
                  deploymentValues: deploymentConfigQuery.data,
                }}
              >
                <Suspense fallback={<Loader />}>
                  <Outlet />
                </Suspense>
              </DeploySettingsContext.Provider>
            ) : (
              <Loader />
            )}
          </main>
        </Stack>
      </Margins>
    </RequirePermission>
  );
};
