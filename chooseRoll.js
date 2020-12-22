export class ChooseRoll extends Dialog {
  constructor(actor, groups, ...args) {
    super(...args);
    game.users.apps.push(this);
    this.actor = actor;
    this.chosen = [];
    this.done = false;
    this.res = [];
    this.checks = [];
    this.groups = groups;
  }

  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
    "title": "Choose a Roll",
    "id": "downtime-ethck",
    "closeOnSubmit": true,
    "popOut": true,
    "width": "auto",
    "height": "auto",
  });
  }

  async getData() {
    return {
      groups: this.groups,
    };
  }

  async chooseRollDialog() {
    const dialogContent = await renderTemplate("modules/downtime-ethck/templates/chooseRoll.html", {groups: this.groups});
    return new Promise(async(resolve, reject) => {
      const dlg = new Dialog({
        title: "Choose Roll",
        content: dialogContent,
        buttons: {
          submit: {
            icon: '<i class="fas fa-dice"></i>',
            label: "Submit",
            callback: (html) => {
              let chosen = [];
              html.find("form > fieldset > div > input:checked").each((i, check) => {
                //console.log(i, check);
                const c = parseInt($(check).val());
                chosen.push(c);
              })
              
              resolve(chosen);
            }
          }
        },
        close: reject
      });
      dlg.render(true);
    });
  }

  activateListeners(html) {
    super.activateListeners(html);
  }
}
