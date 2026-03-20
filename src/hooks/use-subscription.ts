import { useTeam } from "./use-team";

export type SubscriptionPlan = "free" | "pro" | "suite";

export interface PlanLimits {
    missionsPerMonth: number | "unlimited";
    hasFacturX: boolean;
    hasWhiteLabel: boolean;
    hasB2BAdvanced: boolean;
    hasMultiWarehouse: boolean;
}

const PLAN_LIMITS: Record<SubscriptionPlan, PlanLimits> = {
    free: {
        missionsPerMonth: 5,
        hasFacturX: false,
        hasWhiteLabel: false,
        hasB2BAdvanced: false,
        hasMultiWarehouse: false,
    },
    pro: {
        missionsPerMonth: "unlimited",
        hasFacturX: true,
        hasWhiteLabel: true,
        hasB2BAdvanced: false,
        hasMultiWarehouse: false,
    },
    suite: {
        missionsPerMonth: "unlimited",
        hasFacturX: true,
        hasWhiteLabel: true,
        hasB2BAdvanced: true,
        hasMultiWarehouse: true,
    },
};

export function useSubscription() {
    const { data: teamData, isLoading } = useTeam();
    const plan = (teamData?.teams as { plan?: string } | null)?.plan as SubscriptionPlan || "free";

    const limits = PLAN_LIMITS[plan];

    const isAtLeast = (requiredPlan: SubscriptionPlan) => {
        const hierarchy: SubscriptionPlan[] = ["free", "pro", "suite"];
        const currentIdx = hierarchy.indexOf(plan);
        const requiredIdx = hierarchy.indexOf(requiredPlan);
        return currentIdx >= requiredIdx;
    };

    return {
        plan,
        limits,
        isLoading,
        isAtLeast,
        isFree: plan === "free",
        isPro: plan === "pro",
        isSuite: plan === "suite",
    };
}
