import { DWTForm } from "./downtime.js";
import { _updateDowntimes } from "./training.js";

export class GMConfig extends FormApplication {
  constructor(...args) {
    super(...args);
    game.users.apps.push(this);
    this.activities = game.settings.get("downtime-ethck", "activities");
  }

  static get defaultOptions() {
    const options = super.defaultOptions;
    options.title = "Modify Global Downtime Events";
    options.id = "downtime-ethck";
    options.template = "modules/downtime-ethck/templates/gmConfig.html";
    options.closeOnSubmit = false;
    options.popOut = true;
    options.width = 600;
    options.height = "auto";
    return options;
  }

  async getData() {
    return {
      activities: this.activities
    };
  }

  render(force, context = {}) {
    return super.render(force, context);
  }

  activateListeners(html) {
    super.activateListeners(html);
    for (let row of this.element.find(
      "#rollableEventsTable > tbody > .rollableEvent"
    )) {
      $(row)
        .find("#deleteRollable")
        .click((event) => this.handleRollableDelete(event, row));
    }
    this.element
      .find(".addWorldDowntime")
      .click((event) => this.addWorldDowntime(event));
    this.element
      .find(".training-edit")
      .click((event) => this.editWorldDowntime(event));

    this.element.find(".import").click((event) => this.importActivities(event));
    this.element.find(".export").click((event) => this.exportActivities(event));

    this.element.find(".activity-move").click((event) => this.moveWorldDowntime(event));

    this.element.find(".duplicate-actor-act").click(() => this.duplicateActorActivities());
  }

  importActivities(event){
    const input = $('<input type="file">')
    input.on("change", this.importWorldActivities);
    input.trigger('click');
  }

  importWorldActivities() {
    const file = this.files[0];
    if (!file) return;

    readTextFromFile(file).then(async result => {
      let settings = JSON.parse(JSON.parse(result).value);
      let [newDowntimes, changed] = await _updateDowntimes(settings);
      game.settings.set("downtime-ethck", "activities", newDowntimes)
    });
  }

  exportActivities(event){
    const data = game.data.settings.find((setting) => setting.key === "downtime-ethck.activities");
    const jsonData = JSON.stringify(data, null, 2);
    saveDataToFile(jsonData, 'application/json', "downtime-ethck-world-activities.json");
    ui.notifications.info("Ethck's Downtime: Saved Activity Data.")
  }

  duplicateActorActivities(){
    new LocalActivityTransfer().render(true);
  }

  async _updateObject(event, formData) {
    return;
  }
}


class LocalActivityTransfer extends FormApplication {
  constructor(...args) {
    super(...args);
    game.users.apps.push(this);
    this.activities = game.settings.get("downtime-ethck", "activities");
  }

  static get defaultOptions() {
    const options = super.defaultOptions;
    options.title = "Copy Activities Between Actors";
    options.id = "downtime-ethck";
    options.template = "modules/downtime-ethck/templates/localActivityTransfer.html";
    options.closeOnSubmit = false;
    options.popOut = true;
    options.width = 600;
    options.height = "auto";
    return options;
  }

  async getData() {
    return {
      activities: this.activities,
      actors: game.actors
    };
  }

  render(force, context = {}) {
    return super.render(force, context);
  }

  activateListeners(html) {
    this.element.find("#srcActor").change(() => this.changeActorAct());

    this.changeActorAct();

    this.element.find("#submit").click(() => this.submit());
  }

  changeActorAct() {
    let actorAct = this.element.find("#actorAct");
    actorAct.empty();

    let srcActorID = $(this.element.find("#srcActor")).val();
    let srcActor = game.actors.get(srcActorID);
    let srcActs = srcActor.getFlag("downtime-ethck", "trainingItems");

    if (srcActs.length) {
      srcActs.forEach((act) => {
        actorAct.append(`<option value=` + act.id + `>` + act.name + `</option>`);
      })
    } else {
      ui.notifications.info("Actor " + srcActor.name + " does not have any downtime activities.");
    }
  }

  async submit() {
    let srcActorID = this.element.find("#srcActor").val();
    let srcActor = game.actors.get(srcActorID);
    let srcActs = srcActor.getFlag("downtime-ethck", "trainingItems");

    let destActorID = this.element.find("#destActor").val();
    let destActor = game.actors.get(destActorID);
    let destActs = destActor.getFlag("downtime-ethck", "trainingItems");

    let transferID = this.element.find("#actorAct").val();
    let activityToTransfer = srcActs.find((a) => a.id == transferID);

    if (srcActorID !== destActorID) {
      if (!destActs) destActs = [];
      let newActivities = destActs.concat([activityToTransfer]);
      await destActor.setFlag('downtime-ethck','trainingItems', newActivities);
      ui.notifications.notify(`Successfully copied ${activityToTransfer.name} from ${srcActor.name} to ${destActor.name}.`);

    } else {
      ui.notifications.error("Source Actor and Destination Actor are the same.");
      return;
    }
  }

  async _updateObject(event, formData) {
    return;
  }
}