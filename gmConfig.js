import { DWTForm } from "./downtime.js";

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
      // Ensure that linked objects are rebound if imported into another world
      for (let activity of settings){
        // If a table with the same id exists, skip
        let table = game.tables.get(activity.complication.table.id);
        if (!table){
          // Is there a table with the same name?
          table = game.tables.getName(activity.complication.table.name);
          if (table) {
            // If so, change id to reflect that.
            activity.complication.table.id = getProperty(table, "_id");
          }
        }
      }
      game.settings.set("downtime-ethck", "activities", settings)
    });
  }

  exportActivities(event){
    const data = game.data.settings.find((setting) => setting.key === "downtime-ethck.activities");
    const jsonData = JSON.stringify(data, null, 2);
    saveDataToFile(jsonData, 'application/json', "downtime-ethck-world-activities.json");
    ui.notifications.info("Ethck's Downtime: Saved Activity Data.")
  }

  duplicateActorActivities(){
    this.createSrcActorDialog();
  }
   
  createSrcActorDialog(){
      new Dialog({
          title: `Copy Activity - Select Source Actor`,
          content: this.createActorDropdown(Array.from(game.actors)),
          buttons: {
              select: {label:`Select as Source`, callback: (html) => {
                          let id = html.find("select[id='actors']")[0].value;
                          let srcActor = game.actors.get(id);
                          this.createActivityDialog(srcActor);
                      }}
          }
      }).render(true);
  }
   
  createActivityDialog(srcActor){
      new Dialog({
          title: `Copy Activity - Select Activity`,
          content: this.createActivityDropdown(srcActor),
          buttons: {
              select: {label:`Copy Activity`, callback: (html) => {
                          let activityId = html.find("select[id='activities']")[0].value;
                          let activityToTransfer = this.getActivity(srcActor, activityId);
                          this.createDestinationActorDialog(srcActor, activityToTransfer);
                      }}
          }
      }).render(true);
  }
 
  createDestinationActorDialog(srcActor, activityToTransfer){
    new Dialog({
        title: `Copy Activity - Select Destination Actor`,
        content: this.createActorDropdown(Array.from(game.actors)),
        buttons: {
          select: {label:`Select as Destination`, callback: async (html) => {
                      let id = html.find("select[id='actors']")[0].value;
                      let destinationActor = game.actors.get(id);
                      let activities = destinationActor.getFlag('downtime-ethck','trainingItems');
                      if (!activities){ activities = [] }
                      let newActivities = activities.concat([activityToTransfer]);
                      await destinationActor.setFlag('downtime-ethck','trainingItems', newActivities);
                      ui.notifications.notify(`Successfully copied ${activityToTransfer.name} from ${srcActor.name} to ${destinationActor.name}.`);
                  }}
        }
    }).render(true);
  }
 
  createActorDropdown(actors){
    let html = `<select id="actors" name="actors">`;
    for(var i=0; i<actors.length; i++){
        html+=`<option value="${actors[i].id}">${actors[i].name}</option>`
    }
    html += `</select>`;
    return html;
  }
 
  createActivityDropdown(actor){
    let activities = actor.getFlag('downtime-ethck','trainingItems');
    let html = `<select id="activities" name="activities">`;
    for(var i=0; i<activities.length; i++){
        html+=`<option value="${activities[i].id}">${activities[i].name}</option>`
    }
    html += `</select>`;
    return html;
  }
 
  getActivity(srcActor, activityId){
    let activities = srcActor.getFlag('downtime-ethck','trainingItems');
    let activity = duplicate(activities.filter( function(a){ return a.id == activityId })[0]);
    activity.id = randomID();
    return activity;
  }

  async _updateObject(event, formData) {
    return;
  }
}
