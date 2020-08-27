export class ChooseRoll extends Dialog {
  constructor(actor, activity, ...args) {
    super(...args);
    game.users.apps.push(this);
    this.actor = actor;
    this.activity = activity;
    this.chosen = [];
    this.done = false;
    this.res = [];
    this.checks = [];
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
    const activity = this.activity;
    return {
      activity,
    };
  }

  async chooseRollDialog() {
    const dialogContent = await renderTemplate("modules/downtime-ethck/templates/chooseRoll.html", {activity: this.activity});
    return new Promise(async(resolve, reject) => {
      const dlg = new Dialog({
        title: "Choose Roll",
        content: dialogContent,
        buttons: {
          submit: {
            icon: '<i class="fas fa-bed"></i>',
            label: "Submit",
            callback: (html) => {
              let chosen = [];
              html.find("form > fieldset > div > input:checked").each((i, check) => {
                const c = parseInt($(check).attr("id"));
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
