// Copyright KSMS. Venus lottery machine sim.
using UnrealBuildTool;

public class KSMSLotto : ModuleRules
{
	public KSMSLotto(ReadOnlyTargetRules Target) : base(Target)
	{
		PCHUsage = PCHUsageMode.UseExplicitOrSharedPCHs;
		PublicDependencyModuleNames.AddRange(new string[] {
			"Core", "CoreUObject", "Engine", "InputCore",
			"Chaos", "FieldSystemEngine", "Niagara", "UMG"
		});
	}
}
