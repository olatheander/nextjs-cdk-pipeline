import * as CDK from "@aws-cdk/core";
import * as CodeBuild from "@aws-cdk/aws-codebuild";
import * as CodePipeline from "@aws-cdk/aws-codepipeline";
import * as CodePipelineAction from "@aws-cdk/aws-codepipeline-actions";
import { StringParameter } from "@aws-cdk/aws-ssm";
import { BuildEnvironmentVariableType } from "@aws-cdk/aws-codebuild";

export class InfraStack extends CDK.Stack {
  constructor(scope: CDK.Construct, id: string, props?: CDK.StackProps) {
    super(scope, id, props);

    // AWS CodeBuild artifacts
    const outputSources = new CodePipeline.Artifact();
    const outputWebsite = new CodePipeline.Artifact();

    const githubOwner = StringParameter.fromStringParameterAttributes(this,
      'gitOwner', {
      parameterName: 'git-owner'
    }).stringValue;

    const githubRepo = StringParameter.fromStringParameterAttributes(this,
      'gitRepo', {
      parameterName: 'git-repo'
    }).stringValue;

    const githubBranch = StringParameter.fromStringParameterAttributes(this,
      'gitBranch', {
      parameterName: 'git-branch'
    }).stringValue;

    const gitHubAction = new CodePipelineAction.GitHubSourceAction({
      actionName: 'GitHub',
      output: outputSources,
      oauthToken: CDK.SecretValue.secretsManager('git-access-token', {
        jsonField: 'git-access-token'
      }), // this token is stored in Secret Manager
      owner: githubOwner,
      repo: githubRepo,
      branch: githubBranch
    })

    // AWS CodePipeline pipeline
    const pipeline = new CodePipeline.Pipeline(this,
      "Pipeline", {
      pipelineName: "MyPipeline",
      restartExecutionOnUpdate: true,
    });

    // AWS CodePipeline stage to clone sources from bitbucket repository
    pipeline.addStage({
      stageName: "Source",
      actions: [gitHubAction],
    });

    // AWS CodePipeline stage to build website and CDK resources
    pipeline.addStage({
      stageName: "Build",
      actions: [
        // AWS CodePipeline action to run CodeBuild project
        new CodePipelineAction.CodeBuildAction({
          actionName: "Website",
          project: new CodeBuild.PipelineProject(this,
            "BuildWebsite", {
            projectName: "MyWebsite",
            environment: {
              buildImage: CodeBuild.LinuxBuildImage.STANDARD_5_0
            },
            buildSpec: CodeBuild.BuildSpec.fromSourceFilename('./buildspec.yaml'),
          }),
          input: outputSources,
          outputs: [outputWebsite],
        }),
      ],
    });
  }
}
