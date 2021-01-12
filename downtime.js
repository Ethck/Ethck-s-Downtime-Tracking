const FORM_TEMPLATE = "modules/downtime-ethck/templates/add-downtime-form2.html";

const DND5E_TOOLS = [
  "Kit",
  "Instrument",
  "Set",
  "Supplies",
  "Tool",
  "Utensil"
];

const COMPLETION_CHANCES = [10, 25, 50, 75, 100];

/*
ACTIVITY_TYPES:
  SUCCESS_COUNT
  ROLL_TOTAL
  NO_ROLL

ROLL_TYPES:
  ABILITY_CHECK
  SAVING_THROW
  SKILL_CHECK
  TOOL_CHECK
  CUSTOM
 */

const ACTIVITY_ROLL_MODEL = {
  type : 0, //* ROLL_TYPES
  roll : "",
  group: "",
  dc   : 0
}

const ACTIVITY_RESULT_MODEL = {
  min    : 0,
  max    : 0,
  details: "",
  triggerComplication: false,
}

const ACTIVITY_MODEL = {
  name       : "New Downtime Activity",
  description: "",
  chat_icon  : "icons/svg/d20.svg",
  sheet_icon : "icons/svg/d20.svg",
  type       : 0,  //* ACTIVITY_TYPES
  roll      : [], //* ACTIVITY_ROLL_MODEL
  result    : [], //* ACTIVITY_RESULT_MODEL
  //id
  complication: {
    chance    : "",
    roll_table: ""
  },
  options: {
    rolls_are_private        : false,
    complications_are_private: false,
    ask_for_materials        : false,
    days_used                : 0,
  }
}

export class DWTForm extends FormApplication {
  constructor(actor = {}, activity = {}, editMode = false, world = false, sheet = {}, ...args) {
    super(...args);
    game.users.apps.push(this);
    this.activity = activity;
    this.actor = actor;
    this.editing = editMode;
    this.image = activity.chat_icon || ""
    this.world = world;
    this.sheet = sheet;
  }

  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id           : "downtime-ethck",
      template     : FORM_TEMPLATE,
      title        : "Downtime Activity Modification",
      closeOnSubmit: true,
      popOut       : true,
      width        : 800,
      height       : "auto",
    })
  }

  async getData() {
    return {
      abilities: CONFIG.DND5E.abilities,
      saves: CONFIG.DND5E.abilities,
      skills: CONFIG.DND5E.skills,
      tools: DND5E_TOOLS,
      activity: this.activity,
      tables: game.tables,
      compChances: COMPLETION_CHANCES
    };
  }

  render(force, context = {}) {
    // Only re-render if needed
    const { action, data } = context;
    return super.render(force, context);
  }

  activateListeners(html) {
    super.activateListeners(html);

    this.element.find(".addRollable").click(() => this.addRollable());
    this.element.find("#rollableEventsTable > li > .result-controls > .delete-roll").click((event) => this.deleteRollable(event));

    this.element.find(".addResult").click(() => this.addResult());
    this.element.find("#resultsTable > li > .result-controls > .delete-result").click((event) => this.deleteResult(event));

    this.element.find("#rollableEventsTable > #rollable > #roll-type > select").change((event) => this.changeValSelect(event));


    this.element.find(".file-picker-cust").click((event) => this.handleImage(event));

    this.element.find('#' + this.activity.type).attr("checked", true);
    this.element.find("#SUCCESS_COUNT, #ROLL_TOTAL, #NO_ROLL").change((event) => this.updateRollsStatus($(event.currentTarget).attr("id")));
    // Set initial state of dropdowns to stored values
    if (this.activity.complication !== undefined) {
      this.element.find("#compchance").val(this.activity.complication.chance);
      this.element.find("#complications").val(this.activity.complication.roll_table);
    }
    // Set initial values of our options
    this.element.find("#privateActivity").attr("checked", this.activity.options?.rolls_are_private);
    this.element.find("#privateComp").attr("checked", this.activity.options?.complications_are_private)
    this.element.find("#timeTaken").val(this.activity.options?.days_used);
    this.element.find("#materials").attr("checked", this.activity.options?.ask_for_materials)

    // set field status based on activity type
    this.updateRollsStatus(this.activity.type);

    if (this.activity.type !== "NO_ROLL") {

      // Handle displaying intitial data
      // TODO: Hand this off to Handlebars???
      this.element.find("#rollableEventsTable > #rollable").each((i, roll) => {
        let id = $(roll).attr("data-id");
        if (id === "template") return;
        let event = this.activity.roll[i - 1]
        let type = event.type;
        let newVal = event.roll || "";

        $(roll).find("#roll-type > select").val(type);
        // Set all roll-val to off
        $(roll).find("#roll-val").find("select, input").css("display", "none");
        $(roll).find("#roll-val").find("select, input").prop("disabled", true);
        // Turn on the correct select based on type
        $(roll).find("#roll-val").find("#" + type).css("display", "");
        $(roll).find("#roll-val > #" + type).val(newVal);
        $(roll).find("#roll-val").find("#" + type).prop("disabled", false);
      });
    }
  }

  async handleImage(event) {
    // Make a new FilePicker to allow the user to 
    // use their own pictures. Update the img
    // in the form when an image is chosen.
    const fp = new FilePicker({
        type: "image",
        callback: (path) => {
            this.image = path;
            $(event.currentTarget).attr("src", path);
        }
    }).browse("");
  }

  /**
   * Adds a new rollable <li> to the list of rollables. Accomplishes
   * this by copying a hidden template and activating it.
   */
  addRollable(){
    // Copy our template roll
    let newRoll = this.element.find('#rollableEventsTable > li[data-id ="template"]').clone();
    // Assign temporary id
    newRoll.attr("data-id", randomID());
    // Show it!
    newRoll.css("display", "");
    // Enable it
    newRoll.find("#roll-type > select, #roll-val > #ABILITY_CHECK").prop("disabled", false)
    newRoll.find("#roll-group > input, #roll-dc > input").prop("disabled", false);
    // Append
    this.element.find("#rollableEventsTable").append(newRoll);
    // Attach new listener
    newRoll.find(".result-controls > .delete-roll").click((event) => this.deleteRollable(event));
    newRoll.find("#roll-type > select").change((event) => this.changeValSelect(event));
  }

  /**
   * Deletes a <li> from the rollalbe list.
   * @param  {[jQuery object]} event Click event from clicking the delete-roll button
   */
  deleteRollable(event){
    event.preventDefault();
    // Retrieve the row we are in
    let row = $(event.currentTarget).parent().parent();
    // Remove it from DOM
    row.remove();
  }

  validateCustom() {
    this.activity.roll.forEach((roll) => {
      if (roll.type === "CUSTOM"){
        let custom = roll.roll;

        // Organize additional properties for use in the context
        // This finds the value of hit dice for any class in the actor
        let hdVals = this.actor.data.items.filter((item) => item.type === "class")
          .map((hd) => parseInt(hd.data.hitDice.split("d")[1]));
        // Find the min and the max
        let hd = {
          min: Math.min.apply(null, hdVals),
          max: Math.max.apply(null, hdVals)
        }

        let context = mergeObject({actor: this.actor, hd: hd}, this.actor.getRollData());
        if (Roll.validate(custom, context)){//ensure no error in custom
          let fail = false;
          custom.split(" + ").forEach((formu) => {
            // If we're accessing a property
            if (formu.startsWith("@")) {
              // Remove either "@actor." or just "@"
              let testProp = formu.startsWith("@actor.") ? formu.slice(7) : formu.slice(1);
              // Test if property does not exist (i.e. if not a valid property)
              if (!(getProperty(context, testProp))) {
                ui.notifications.warn("Ethck's Downtime Tracking | " + formu + " is not present in the context.");
                fail = true;
              }
            }
          })
          if (fail) throw "Error in context for rolling.";
        } else {
          ui.notifications.warn("Ethck's Downtime Tracking | This is not a valid roll formula.");
          return;
        }
      }
    });
  }

  /**
   * Handle changes of the "Roll Type" to dynamically change the "Roll"
   * options. For all except type "CUSTOM" we unhide a <select> with
   * dynamic options. "CUSTOM" maintains a simple input.
   * 
   * @param  {[jQuery object]} event triggering change event from a "Roll Type" select.
   */
  changeValSelect(event) {
    event.preventDefault();
    // double parent used to stay within the same row
    let valSelect = $(event.currentTarget).parent().parent().find("#roll-val");
    let type = $(event.currentTarget).val();

    valSelect.find("select, input").css("display", "none");
    valSelect.find("select, input").prop("disabled", true);
    valSelect.find("#" + type).css("display", "");
    valSelect.find("#" + type).prop("disabled", false);
  }

  updateRollsStatus(type) {
    // Reset all non-template selects and inputs to enabled
    this.element.find(`#rollsTable li:not([data-id="template"]) select, 
      #rollsTable li:not([data-id="template"]) input`).prop("disabled", false);

    // Reset status of the multiple selects that respond to roll.roll by invoking
    // a change event to get changeValSelect() to do its magic.
    this.element.find('#rollsTable li:not([data-id="template"]) select').trigger("change");
    // Turn off DCs
    if (type === "ROLL_TOTAL") {
      this.element.find("li > #roll-dc > input").prop("disabled", true);
    // Turn off everything
    } else if (type === "NO_ROLL") { 
      this.element.find("#rollsTable select, #rollsTable input").prop("disabled", true);
    }
  }
  
  addResult() {
    // Copy our template result
    let newResult = this.element.find('#resultsTable > li[data-id ="template"]').clone();
    // Assign temporary id
    newResult.attr("data-id", randomID());
    // Show it!
    newResult.css("display", "");
    newResult.find(".result-range > input, .result-details > input, #triggerComplication").prop("disabled", false);
    // Append
    this.element.find("#resultsTable > ol").append(newResult);
    // Attach new listener
    newResult.find(".result-controls > .delete-result").click((event) => this.deleteResult(event));
  }

  deleteResult(event) {
    event.preventDefault();
    // Retrieve the row we are in
    let row = $(event.currentTarget).parent().parent();
    // Remove it from DOM
    row.remove();
  }
  
  /*
  Loads data from a "form" table that stores the values in each column as
  a seperate array into an array of rows, where each row has the same
  shape as `model`.
  
  As an example, for `rows` with the shape:
    [{group: "a", dc: 8}, {group: "b", dc: 72}, {group: "c", dc: 3}]
  would be represented with columns (expanded FormData) that has the shape:
    {group: ["a", "b", "c"], dc: [8, 72, 3]}
  
  Other assumptions:
    - A column will either be undefined, or be an array with the same
      length as other defined columns.
    - All existing rows have defined values for all keys in `model`.

  @param  {[object]} rows      currently filled out model with vals
  @param {[object]} columns    expanded FormData 
  @param {[object]} model      data model to base structure on
  @param {[String]} dataPrefix prefix for column names

  Special thanks to @Varriount#0883 for their help on this!
  */
  loadModelFromTable(rows, columns, model, dataPrefix){
    for (const key of Object.keys(model)){
      // Retrieve the column of data, ignore all falsy values
      const column = columns[dataPrefix + "." + key];

      // Calculate where rows currently exist, and where they will
      // need to be created.
      // This is because, if we extend the length of `rows`, we will have 2
      // sections - one containing existing rows, and one containing
      // `undefined` values.
      const existingRowsEnd = Math.min(column.length, rows.length);
      const allRowsEnd = column.length;

      // Shrink or extend `rows` to remove or add new rows.
      rows.length = column.length;

      // Loop through the data in the current column.
      let i = 0;

      // Update existing rows with the column data.
      for (; i < existingRowsEnd; i++) {
        rows[i][key] = column[i];
      }

      // Create new rows with the column data.
      for (; i < allRowsEnd; i++) {
        const row = {};
        row[key]  = column[i];
        rows[i]   = row;
      }
    }
  }

  async _updateObject(event, formData) {
    // preserve old ID or make new one
    let id = 0;
    if ("id" in this.activity) {
      id = this.activity.id;
    } else {
      id = randomID();
    }
    // ensure id is a string
    if (typeof id === "number") id = id.toString();

    let rolls = this.activity.roll;
    let results = this.activity.result;

    // recreate activity
    this.activity = expandObject(formData);
    this.activity.id = id;

    // Load old roll/result from activity otherwise
    // loadModelFromTable requires these to exist
    this.activity.roll = rolls || [];
    this.activity.result = results || [];

    this.activity.chat_icon = this.image;

    if ("roll.roll" in formData) {
      // there is a disabled template that needs to be pruned. It is
      // always in the first slot of the formData array, so we can just remove
      // it.
      formData["roll.type"].shift()
      formData["roll.group"].shift()
      if ("roll.dc" in formData) {
        formData["roll.dc"].shift()
      } else {
        // if activity type (not roll.type) is NOT SUCCESS_COUNT
        // the ALL DC fields are disabled, thus roll.dc does not
        // exist. loadModelFromTable requires all columns to exist.
        // So we make a new array of the same size as roll.type and
        // fill it with null (just some default non-visible value).
        formData["roll.dc"] = Array(formData["roll.type"].length).fill(null)
      }
      // roll.roll is FILLED with nulls because every
      // select (5 * row) has a value, but only one
      // is enabled. All the disabled selects (also hidden)
      // return null in the formData
      formData["roll.roll"] = formData["roll.roll"].filter((x) => x !== null);
      this.loadModelFromTable(this.activity.roll, formData, ACTIVITY_ROLL_MODEL, "roll");
    }

    if ("result.min" in formData){
      // Same deal with the template applies here
      formData["result.min"].shift();
      formData["result.max"].shift();
      formData["result.details"].shift();
      formData["result.triggerComplication"].shift();
      this.loadModelFromTable(this.activity.result, formData, ACTIVITY_RESULT_MODEL, "result");
    }

    // extra validate on custom formulas...
    try {
      this.validateCustom();
    } catch (e) {
      console.error(e);
      throw "Ethck's Downtime Tracking | Broken custom formula. Please fix."
    }

    // Update!!!
    const actor = this.actor;
    // local scope
    if (!this.world) {
      let flags = actor.getFlag("downtime-ethck", "trainingItems");

      if (this.editing) {
        let act = flags.find((act) => act.id == this.activity.id);
        let idx = flags.indexOf(act);
        flags[idx] = this.activity;
      } else {
        flags.push(this.activity);
      }
      await actor.unsetFlag("downtime-ethck", "trainingItems")
      await actor.setFlag("downtime-ethck", "trainingItems", flags)
    // World scope
    } else {
      this.activity["world"] = true;
      const settings = game.settings.get("downtime-ethck", "activities");
      if (this.editing) {
        let act = settings.find((act) => act.id == this.activity.id);
        let idx = settings.indexOf(act);
        settings[idx] = this.activity;
      } else {
        settings.push(this.activity);
      }
      await game.settings.set("downtime-ethck", "activities", settings);
      // rerender the character sheet to reflect updated activities
      this.sheet.render(true);
    }
  }
}
