export class ChooseRoll extends FormApplication {
  constructor(actor, activity, groupRoll, ...args) {
    super(...args);
    game.users.apps.push(this);
    this.actor = actor;
    this.activity = activity;
    this.groupRoll = groupRoll;
    this.chosen = [];
    this.done = false;
    this.res = [];
  }

  static get defaultOptions() {
    const options = super.defaultOptions;
    options.title = "Choose a Roll";
    options.id = "downtime-ethck";
    options.template = "modules/downtime-ethck/templates/chooseRoll.html";
    options.closeOnSubmit = true;
    options.popOut = true;
    options.width = 600;
    options.height = "auto";
    return options;
  }

  async getData() {
    const groupRoll = this.groupRoll;
    return {
      groupRoll,
    };
  }

  async rollDC(rollable) {
    const rdc = new Roll(rollable[1]);
    const dcRoll = rdc.roll();
    dcRoll.toMessage(
      {},
      {
        rollMode: game.settings.get("downtime-ethck", "dcRollMode"),
        create: true,
      }
    );

    return dcRoll;
  }

  async rollRollable(rollable) {
    let abilities = ["str", "dex", "con", "int", "wis", "cha"];
    const actor = this.actor;
    const activity = this.activity;
    const skills = CONFIG.DND5E.skills;

    if (rollable[0].includes("Check")) {
      let abiAcr = abilities.find((abi) =>
        rollable[0].toLowerCase().includes(abi)
      );
      await actor.rollAbilityTest(abiAcr).then(async (r) => {
        const dc = await this.rollDC(rollable);
        this.res.push([r._total, dc._total]);
      });
    } else if (rollable[0].includes("Save")) {
      let abiAcr = abilities.find((abi) =>
        rollable[0].toLowerCase().includes(abi)
      );
      await actor.rollAbilitySave(abiAcr).then(async (r) => {
        const dc = await this.rollDC(rollable);
        this.res.push([r._total, dc._total]);
      });
    } else {
      let skillAcr = Object.keys(skills).find((key) =>
        skills[key].toLowerCase().includes(rollable[0].toLowerCase())
      );
      await actor.rollSkill(skillAcr).then(async (r) => {
        const dc = await this.rollDC(rollable);
        this.res.push([r._total, dc._total]);
      });
    }

    this.done = true;
  }

  render(force, context = {}) {
    return super.render(force, context);
  }

  activateListeners(html) {
    super.activateListeners(html);
  }

  async _updateObject(event, formData) {
    const checked = this.element.find("form > fieldset > input:checked");
    const rollable = this.groupRoll.rolls.find(
      (gr) => parseInt(checked.attr("id")) === gr[2]
    );
    this.chosen = rollable;
    this.rollRollable(this.chosen);
  }
}
