export interface BanditChoice {
  actionId: string
  expectedReward: number
  wasExploration: boolean
}

export interface BanditParams {
  actionId: string
  mu: number[]
  sigma: number[]
  updatedAt: Date
}
