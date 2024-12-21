import * as core from '@actions/core'
import { Context } from '@actions/github/lib/context'
import { GitHub } from '@actions/github/lib/utils'
import * as inputs from './inputs'

/**
 *
 */
export class Label {
  private input: inputs.Label

  /**
   *
   */
  constructor(input: inputs.Label) {
    this.input = input
  }

  /**
   *
   */
  get name(): string {
    return inputs.getLabel(this.input)
  }

  /**
   *
   */
  get description(): string {
    switch (this.input) {
      case inputs.Label.ExtraSmall:
        return 'Pull requests with a very small number of lines changed.'

      case inputs.Label.Small:
        return 'Pull requests with a small number of lines changed.'

      case inputs.Label.Medium:
        return 'Pull requests with a medium number of lines changed.'

      case inputs.Label.Large:
        return 'Pull requests with a large number of lines changed.'

      case inputs.Label.ExtraLarge:
        return 'Pull requests with a very large number of lines changed.'

      case inputs.Label.ExtraExtraLarge:
        return 'Pull requests with a very, very large number of lines changed.'
    }
  }

  /**
   *
   */
  get color(): string {
    // TODO: make configurable?
    return '4f348b'
  }

  /**
   *
   */
  get threshold(): number {
    switch (this.input) {
      case inputs.Label.ExtraSmall:
        return inputs.getThreshold(inputs.Threshold.ExtraSmall)

      case inputs.Label.Small:
        return inputs.getThreshold(inputs.Threshold.Small)

      case inputs.Label.Medium:
        return inputs.getThreshold(inputs.Threshold.Medium)

      case inputs.Label.Large:
        return inputs.getThreshold(inputs.Threshold.Large)

      case inputs.Label.ExtraLarge:
        return inputs.getThreshold(inputs.Threshold.ExtraLarge)

      case inputs.Label.ExtraExtraLarge:
        return Infinity
    }
  }
}

/**
 *
 */
export class LabelManager {
  private context: Context
  private octokit: InstanceType<typeof GitHub>
  private labels: Label[]

  /**
   *
   */
  constructor(context: Context, octokit: InstanceType<typeof GitHub>) {
    this.context = context
    this.octokit = octokit

    this.labels = [
      new Label(inputs.Label.ExtraSmall),
      new Label(inputs.Label.Small),
      new Label(inputs.Label.Medium),
      new Label(inputs.Label.Large),
      new Label(inputs.Label.ExtraLarge),
      new Label(inputs.Label.ExtraExtraLarge)
    ]
  }

  /**
   *
   */
  public async create(): Promise<void> {
    const resp = await this.octokit.rest.issues.listLabelsForRepo({
      owner: 'mattdowdell',
      repo: 'pr-size'
    })
    const have = new Set(resp.data.map(l => l.name))
    const missing = this.labels.filter(l => !have.has(l.name))

    for (const label of missing) {
      core.debug(`creating label: ${label.name}`)

      await this.octokit.rest.issues.createLabel({
        owner: 'mattdowdell',
        repo: 'pr-size',
        name: label.name,
        color: label.color,
        description: label.description
      })
    }
  }

  /**
   *
   */
  public select(size: number): Label {
    for (const label of this.labels) {
      if (label.threshold > size) {
        return label
      }
    }

    return this.labels[-1]
  }

  /**
   *
   */
  public async assign(label: Label): Promise<void> {
    const resp = await this.octokit.rest.issues.listLabelsOnIssue({
      owner: 'mattdowdell',
      repo: 'pr-size',
      issue_number: 22
    })

    const have = new Set(resp.data.map(l => l.name))
    const labels = new Set(this.labels.slice())

    labels.delete(label)

    if (!have.has(label.name)) {
      core.debug(`adding label: ${label.name}`)

      await this.octokit.rest.issues.addLabels({
        owner: 'mattdowdell',
        repo: 'pr-size',
        issue_number: 22,
        labels: [label.name]
      })
    }

    for (const rm of labels) {
      if (have.has(rm.name)) {
        core.debug(`removing label: ${rm}`)

        await this.octokit.rest.issues.removeLabel({
          owner: 'mattdowdell',
          repo: 'pr-size',
          issue_number: 22,
          name: rm.name
        })
      }
    }
  }
}
