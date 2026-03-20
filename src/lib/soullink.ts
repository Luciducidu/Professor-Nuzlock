import { db } from './db'
import { getSoulLinkPlayers, isSoulLinkProject } from './projectSettings'
import type { Encounter, PlayerId, Project } from './types'

export type SoullinkEncounterPair = {
  linkGroupId: string
  p1: Encounter
  p2: Encounter
}

function buildSoullinkPairs(encounters: Encounter[]): SoullinkEncounterPair[] {
  const byId = new Map(encounters.map((encounter) => [encounter.id, encounter]))
  const pairs = new Map<string, SoullinkEncounterPair>()

  for (const encounter of encounters) {
    if (encounter.playerId !== 'p1' && encounter.playerId !== 'p2') continue
    if (!encounter.linkGroupId || !encounter.linkedEncounterId) continue

    const partner = byId.get(encounter.linkedEncounterId)
    if (!partner) continue
    if (partner.linkGroupId !== encounter.linkGroupId || partner.linkedEncounterId !== encounter.id) continue

    const p1 = encounter.playerId === 'p1' ? encounter : partner.playerId === 'p1' ? partner : null
    const p2 = encounter.playerId === 'p2' ? encounter : partner.playerId === 'p2' ? partner : null
    if (!p1 || !p2) continue

    pairs.set(encounter.linkGroupId, { linkGroupId: encounter.linkGroupId, p1, p2 })
  }

  return Array.from(pairs.values()).sort((a, b) => a.p1.createdAt - b.p1.createdAt)
}

export function getPrimarySoullinkEncounter(encounters: Encounter[], playerId: PlayerId): Encounter | null {
  const primaryPair = buildSoullinkPairs(encounters).find(
    (pair) => pair.p1.encounterType === 'normal' && pair.p2.encounterType === 'normal',
  )

  if (!primaryPair) return null
  return playerId === 'p1' ? primaryPair.p1 : primaryPair.p2
}

export function getPrimarySoullinkPair(encounters: Encounter[]): Record<PlayerId, Encounter | null> {
  return {
    p1: getPrimarySoullinkEncounter(encounters, 'p1'),
    p2: getPrimarySoullinkEncounter(encounters, 'p2'),
  }
}

export function getSoullinkExtraPairs(encounters: Encounter[]): SoullinkEncounterPair[] {
  return buildSoullinkPairs(encounters).filter(
    (pair) => pair.p1.encounterType !== 'normal' || pair.p2.encounterType !== 'normal',
  )
}

export function isSoullinkEncounterDead(encounter: Encounter): boolean {
  return encounter.outcome === 'not_caught' || (encounter.outcome === 'caught' && encounter.isDead)
}

export async function updateEncounterDeathState(project: Project, encounterId: string, isDead: boolean): Promise<void> {
  const encounter = await db.encounters.get(encounterId)
  if (!encounter) return

  if (!isSoulLinkProject(project) || !encounter.linkedEncounterId) {
    await db.encounters.update(encounter.id, { isDead })
    return
  }

  const partner = await db.encounters.get(encounter.linkedEncounterId)
  await db.transaction('rw', db.encounters, async () => {
    await db.encounters.update(encounter.id, { isDead })
    if (partner) {
      await db.encounters.update(partner.id, { isDead })
    }
  })
}

export async function deleteEncounterWithPartner(project: Project, encounter: Encounter): Promise<void> {
  if (!isSoulLinkProject(project) || !encounter.linkedEncounterId) {
    await db.encounters.delete(encounter.id)
    return
  }

  const linkedEncounterId = encounter.linkedEncounterId
  await db.transaction('rw', db.encounters, async () => {
    await db.encounters.delete(encounter.id)
    await db.encounters.delete(linkedEncounterId)
  })
}

export function getPlayerName(project: Project, playerId: PlayerId): string {
  const players = getSoulLinkPlayers(project)
  if (!players) return playerId === 'p1' ? 'Spieler 1' : 'Spieler 2'
  return playerId === 'p1' ? players[0].name || 'Spieler 1' : players[1].name || 'Spieler 2'
}
