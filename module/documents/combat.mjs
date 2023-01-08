/** Extensions to Foundry's combat systems */
export class PokeroleCombat extends Combat {
  /** @override */
  async combatStart() {
    await super.combatStart();
    this.resetActionCounters();
  }

  /** @override */
  async nextRound() {
    let shouldContinue = false;
    await Dialog.confirm({
      title: game.i18n.localize('POKEROLE.CombatNextRoundDialogTitle'),
      content: game.i18n.localize(`<p>${game.i18n.localize('POKEROLE.CombatNextRoundDialogContent')}</p>`),
      yes: () => shouldContinue = true,
    });

    if (shouldContinue) {
      await super.nextRound();
      this.resetActionCounters();
    }
  }

  /** @override */
  async nextTurn() {
    // Copied from base class
    let turn = this.turn ?? -1;
    let skip = this.settings.skipDefeated;

    // Determine the next turn number
    let next = null;
    if ( skip ) {
      for ( let [i, t] of this.turns.entries() ) {
        if ( i <= turn ) continue;
        if ( t.isDefeated ) continue;
        next = i;
        break;
      }
    }
    else next = turn + 1;

    // Maybe reset to the beginning of the round
    let round = this.round;
    if (this.round === 0) {
      return super.nextRound();
    }
    if ( (next === null) || (next >= this.turns.length) ) {
      // The original implementation starts the next round here.
      // In Pokérole, players can use up to five actions per round where the
      // initiative order resets in each sub-round, so wrapping around to the
      // beginning feels more natural.
      return this.resetRound();
    }

    // Update the document, passing data through a hook first
    const updateData = {round, turn: next};
    const updateOptions = {advanceTime: CONFIG.time.turnTime, direction: 1};
    Hooks.callAll("combatTurn", this, updateData, updateOptions);
    return this.update(updateData, updateOptions);
  }

  static registerHooks() {
    Hooks.on('renderCombatTracker', (tracker, elem) => {
      if (!tracker.viewed || !tracker.viewed.round) {
        // Only add the custom button if there's actually an active encounter
        return;
      }

      // Add a button that allows going back to the first combatant in initiative order
      const resetRoundButton = document.createElement('a');
      resetRoundButton.dataset.tooltip = game.i18n.localize('POKEROLE.CombatResetRound');

      const icon = document.createElement('i');
      icon.classList.add('fas');
      icon.classList.add('fa-repeat');

      resetRoundButton.appendChild(icon);

      elem.find('#combat-controls').append(resetRoundButton);

      resetRoundButton.addEventListener('click', () => {
        game.combat.resetRound();
      });
    });
  }

  /** Go back to the start of a round */
  async resetRound() {
    const updateData = { round: this.round, turn: 0 };
    const updateOptions = { advanceTime: CONFIG.time.turnTime, direction: 1 };
    Hooks.callAll("POKEROLE.combatResetRound", this, updateData, updateOptions);
    return this.update(updateData, updateOptions);
  }

  /** Reset action counters at the start of a new round */
  resetActionCounters() {
    for (const combatant of this.combatants) {
      const scene = game.scenes.get(combatant.sceneId);
      if (!scene) continue;
      const token = scene.tokens.get(combatant.tokenId);
      if (!token) continue;

      if (token.actor.isOwner) {
        token.actor.resetActionCount();
      }
    }
  }
}
