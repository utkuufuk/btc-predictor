import { PlayerSchema, type Player } from '@btc-predictor/common';
import { FieldValue } from 'firebase-admin/firestore';

import { firestore } from './firebase.js';

const PLAYERS_COLLECTION = 'players';

export class AliasTakenError extends Error {}

export async function getPlayer(firebaseUid: string): Promise<Player | null> {
  const snapshot = await firestore.collection(PLAYERS_COLLECTION).doc(firebaseUid).get();
  if (!snapshot.exists) {
    return null;
  }

  return PlayerSchema.parse(snapshot.data());
}

export async function createPlayer(firebaseUid: string, alias: string): Promise<Player> {
  const matchingPlayers = await firestore
    .collection(PLAYERS_COLLECTION)
    .where('alias', '==', alias)
    .get();

  if (!matchingPlayers.empty) {
    throw new AliasTakenError();
  }

  const player: Player = { alias, score: 0 };

  await firestore
    .collection(PLAYERS_COLLECTION)
    .doc(firebaseUid)
    .create({
      ...player,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

  return player;
}
