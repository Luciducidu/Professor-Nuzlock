import { db } from './db'
import { getSoulLinkPlayers, isSoulLinkProject } from './projectSettings'
import type { Encounter, PlayerId, Project } from './types'

export function getPrimarySoullinkEncounter(
  encounters: Encounter[],
  playerId: PlayerId,
): Encounter | null {
  const primary = encounters
    .filter((encounter) => encounter.playerId === playerId && Boolean(encounter.linkGroupId))
    .sort((a, b) => a.createdAt - b.createdAt)

  return primary[0] ?? null
}

export function getPrimarySoullinkPair(encounters: Encounter[]): Record<PlayerId, Encounter | null> {
  return {
    p1: getPrimarySoullinkEncounter(encounters, 'p1'),
    p2: getPrimarySoullinkEncounter(encounters, 'p2'),
  }
}

export function getSoullinkExtras(encounters: Encounter[]): Encounter[] {
  return encounters
    .filter((encounter) => !encounter.linkGroupId)
    .sort((a, b) => a.createdAt - b.createdAt)
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
