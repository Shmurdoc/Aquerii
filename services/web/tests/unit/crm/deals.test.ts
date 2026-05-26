import { selectPipeline, dealsByStage, stageValue, Pipeline, Deal } from '@/lib/crm'

const defaultPipeline: Pipeline = {
  id: 'p1', name: 'Sales', is_default: true, stages: [],
}

const otherPipeline: Pipeline = {
  id: 'p2', name: 'Support', is_default: false, stages: [],
}

const pipelines = [otherPipeline, defaultPipeline]

describe('selectPipeline', () => {
  it('returns pipeline matching given ID', () => {
    expect(selectPipeline(pipelines, 'p2')).toBe(otherPipeline)
  })

  it('returns default pipeline when ID does not match', () => {
    expect(selectPipeline(pipelines, null)).toBe(defaultPipeline)
  })

  it('returns first pipeline when no ID and no default', () => {
    const noDefault = [{ ...otherPipeline, is_default: false }]
    expect(selectPipeline(noDefault, null)).toEqual(noDefault[0])
  })

  it('returns undefined for empty list', () => {
    expect(selectPipeline([], null)).toBeUndefined()
  })
})

describe('dealsByStage', () => {
  const deals: Deal[] = [
    { id: 'd1', title: 'Deal 1', stage_id: 's1', value: 100, currency: 'USD', pipeline_id: 'p1', ai_score: null, created_at: '', updated_at: '' },
    { id: 'd2', title: 'Deal 2', stage_id: 's2', value: 200, currency: 'USD', pipeline_id: 'p1', ai_score: null, created_at: '', updated_at: '' },
    { id: 'd3', title: 'Deal 3', stage_id: 's1', value: 300, currency: 'USD', pipeline_id: 'p1', ai_score: null, created_at: '', updated_at: '' },
  ]

  it('filters deals by stage_id', () => {
    expect(dealsByStage(deals, 's1')).toHaveLength(2)
    expect(dealsByStage(deals, 's2')).toHaveLength(1)
  })

  it('returns empty array for stage with no deals', () => {
    expect(dealsByStage(deals, 's3')).toEqual([])
  })
})

describe('stageValue', () => {
  const deals: Deal[] = [
    { id: 'd1', title: 'Deal 1', stage_id: 's1', value: 100, currency: 'USD', pipeline_id: 'p1', ai_score: null, created_at: '', updated_at: '' },
    { id: 'd2', title: 'Deal 2', stage_id: 's1', value: null, currency: 'USD', pipeline_id: 'p1', ai_score: null, created_at: '', updated_at: '' },
    { id: 'd3', title: 'Deal 3', stage_id: 's1', value: 50, currency: 'USD', pipeline_id: 'p1', ai_score: null, created_at: '', updated_at: '' },
  ]

  it('sums deal values for a stage', () => {
    expect(stageValue(deals, 's1')).toBe(150)
  })

  it('treats null values as 0', () => {
    const nullDeals: Deal[] = [
      { id: 'd1', title: 'Null deal', stage_id: 's1', value: null, currency: 'USD', pipeline_id: 'p1', ai_score: null, created_at: '', updated_at: '' },
    ]
    expect(stageValue(nullDeals, 's1')).toBe(0)
  })

  it('returns 0 for stage with no deals', () => {
    expect(stageValue(deals, 's2')).toBe(0)
  })
})
