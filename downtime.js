const FORM_TEMPLATE = "modules/downtime-ethck/templates/add-downtime-form2.html";

const EDIT_DOWNTIME_TITLE = "Edit a Downtime Activity";
const ADD_DOWNTIME_TITLE = "Add a Downtime Event";

const DND5E_TOOLS = [
  "Alchemist's Supplies",
  "Brewer's Supplies",
  "Calligrapher's Supplies",
  "Carpenter's Tools",
  "Cartographer's Tools",
  "Cobbler's Tools",
  "Cook's Utensils",
  "Dice Set",
  "Disguise Kit",
  "Forgery Kit",
  "Glassblower's Tools",
  "Herbalism Kit",
  "Jeweler's Tools",
  "Leatherworker's Tools",
  "Mason's Tools",
  "Musical Instrument(s)",
  "Navigator's Tools",
  "Painter's Supplies",
  "Playing Card Set",
  "Poisoner's Kit",
  "Potter's Tools",
  "Smith's Tools",
  "Thieves' Tools",
  "Tinker's Tools",
  "Weaver's Tools",
  "Woodcarver's Tools",
];

//* Perhaps this should be changed to a number input?
const COMPLETION_CHANCES = [10, 25, 50, 75, 100];

const ACTIVITY_TYPES = {
  SUCCESS_COUNT: 1,
  ROLL_TOTAL   : 2,
  NO_ROLL      : 3,
};

const ROLL_TYPES = {
  ABILITY_CHECK: 1,
  SAVING_THROW : 2,
  SKILL_CHECK  : 3,
  TOOL_CHECK   : 4,
  CUSTOM       : 5,
};

const ACTIVITY_ROLL_MODEL = {
  type : 0, //* ROLL_TYPES
  roll : "",
  group: "",
  dc   : 0,
}

const ACTIVITY_RESULT_MODEL = {
  min    : 0,
  max    : 0,
  details: ""
}

const ACTIVITY_MODEL = {
  name       : "New Downtime Activity",
  description: "",
  chat_icon  : "icons/svg/d20.svg",
  sheet_icon : "icons/svg/d20.svg",
  type       : 0,  //* ACTIVITY_TYPES
  rolls      : [], //* ACTIVITY_ROLL_MODEL
  results    : [], //* ACTIVITY_RESULT_MODEL
  complications: {
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
  constructor(actor = {}, activity = {}, editMode = false, ...args) {
    super(...args);
    game.users.apps.push(this);
    this.activity = activity;
    this.rollableEvents = activity["rollableEvents"] || [];
    this.rolls = activity["rolls"];
    this.results = activity["results"] || [];
    this.actor = actor;
    this.edit = editMode;
    this.image = activity["img"] || ""
  }

  static get defaultOptions() {
    let title = this.editing ? EDIT_DOWNTIME_TITLE : ADD_DOWNTIME_TITLE;

    return mergeObject(super.defaultOptions, {
      id           : "downtime-ethck",
      template     : FORM_TEMPLATE,
      title        : title,
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
    // // Add results
    // this.element.find(".addResult").click((event) => this.handleResults(event));
    // // Deletes on result(s)
    // this.element
    //   .find("#resultsTable > tbody > .result")
    //   .on("click", "#deleteResult", (event) => this.handleResultDelete(event));
    // Picture picker
    // 
    this.element.find(".addRollable").click(() => this.addRollable());
    this.element.find("#rollableEventsTable > li > .result-controls > .delete-roll").click((event) => this.deleteRollable(event));

    this.element.find(".addResult").click(() => this.addResult());
    this.element.find("#resultsTable > li > .result-controls > .delete-result").click((event) => this.deleteResult(event));

    this.element.find("#rollableEventsTable > #rollable > #roll-type > select").change((event) => this.changeValSelect(event));


    this.element.find(".file-picker-cust").click((event) => this.handleImage(event));

    // Not really a listener, but update the state of this.
    if (this.activity.type === "categories"){
        this.element.find("#categoryActivity").attr("checked", true);
    } else if (this.activity.type === "noRoll"){
      this.element.find("#noRollActivity").attr("checked", true);
    }
    // Set initial state of dropdowns to stored values
    if (this.activity.complication !== undefined) {
      this.element.find("#compchance").val(this.activity.complication.chance);
      this.element.find("#complications").val(this.activity.complication.table.id);
    }
    // Set initial values of our options                        OLD                      NEW
    this.element.find("#privateActivity").attr("checked", this.activity.private || this.activity.actPrivate);
    this.element.find("#privateComp").attr("checked", this.activity.compPrivate)
    this.element.find("#timeTaken").val(this.activity.timeTaken);
    this.element.find("#materials").attr("checked", this.activity.useMaterials)

    // Set initial values of rollables
    this.element.find("#rollableEventsTable > #rollable").each((i, roll) => {
      let id = $(roll).attr("data-id");
      if (id === "template") return;
      let event = this.rolls.find((rble) => rble.id == id);
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
    newRoll.find("#roll-val > select, #roll-type > select").prop("disabled", false)
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
    this.activity.rolls.forEach((roll) => {
      if (roll.type === "CUSTOM"){
        let custom = roll.roll;
        let context = mergeObject({actor: this.actor}, this.actor.getRollData());
        if (Roll.validate(custom, context)){//ensure no error in custom
          let fail = false;
          custom.split(" + ").forEach((formu) => {
            // If we're accessing a property
            if (formu.startsWith("@")) {
              // Remove either "@actor." or just "@"
              let testProp = formu.startsWith("@actor.") ? formu.slice(7) : formu.slice(1);
              // Test if property does not exist (i.e. if not a valid property)
              if (!(getProperty(this.actor, testProp)) && !(getProperty(this.actor.getRollData(), testProp))) {
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
   * options. For all except type "custForm" we unhide a <select> with
   * dynamic options. "custForm" maintains a simple input.
   * 
   * @param  {[jQuery object]} event triggering change event from a "Roll Type" select.
   */
  changeValSelect(event) {
    event.preventDefault();

    let valSelect = $(event.currentTarget).parent().parent().find("#roll-val");
    let type = $(event.currentTarget).val();

    valSelect.find("select, input").css("display", "none");
    valSelect.find("select, input").prop("disabled", true);
    valSelect.find("#" + type).css("display", "");
    valSelect.find("#" + type).prop("disabled", false);
  }
  
  addResult() {
    // Copy our template result
    let newResult = this.element.find('#resultsTable > li[data-id ="template"]').clone();
    // Assign temporary id
    newResult.attr("data-id", randomID());
    // Show it!
    newResult.css("display", "");
    // Append
    this.element.find("#resultsTable").append(newResult);
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

  loadArrayModel(entries, model, formData, dataPrefix){
    for (const key of Object.keys(model)){
      const data = formData[dataPrefix + "." + key].filter(x => x);
      console.log(entries.length, data.length);


      const midpoint = Math.min(data.length, entries.length);
      const end = Math.max(data.length, entries.length);

      entries.length = data.length;
      console.log(entries.length);

      let i = 0;
      for (; i < midpoint; i++) {
        entries[i][key] = data[i];
      }

      for (; i < end; i++) {
        const entry   = {}
        entry[key]    = data[i];
        entries[i] = entry;
      }
    }

    console.log(entries);
  }

  async _updateObject(event, formData) {
    //console.log(event, expandObject(formData));

    //console.log(Object.values(expandObject(formData).results)[0])
    // create/edit activity to show
    // Get vals from form
    const actName = this.element.find("#name").val();
    const actDesc = this.element.find("#desc").val();
    const actRollImage = this.element.find('[name="rollIcon"]').val() || "icons/svg/d20.svg";
    const actType =
      this.element.find("#succFailActivity:checked").val() ||
      this.element.find("#categoryActivity:checked").val() ||
      this.element.find("#noRollActivity:checked").val();
    const actPrivate = this.element.find("#privateActivity").prop("checked");
    const compPrivate = this.element.find("#privateComp").prop("checked");
    const actTimeTaken = this.element.find("#timeTaken").val();
    const useMaterials = this.element.find("#materials").prop("checked");

    console.log(formData);
    this.loadArrayModel(this.activity.rolls, ACTIVITY_ROLL_MODEL, formData, "roll");
    this.loadArrayModel(this.activity.results, ACTIVITY_RESULT_MODEL, formData, "result");

    // Make the complication object with table and chance

    const complication = {
      table: {
        id: this.element.find("#complications").val()
      },
      chance: parseInt(this.element.find("#compchance").val())
    }

    try {
      this.validateCustom();
    } catch (e) {
      console.error(e);
      throw "Ethck's Downtime Tracking | Broken custom formula. Please fix."
    }

    // Setup or update the values of our activity
    let activity = {};
    if (!this.edit) {
      activity = {
        name: actName || "New Downtime Activity",
        description: actDesc || "",
        changes: [],
        //rollableEvents: this.rollableEvents,
        results: this.activity.results,
        id: Date.now(),
        type: actType,
        img: this.image,
        complication: complication,
        actPrivate: actPrivate,
        compPrivate: compPrivate,
        actTimeTaken: actTimeTaken,
        rollIcon: actRollImage,
        useMaterials: useMaterials,
        rolls: this.rolls
      };
    } else {
      activity = this.activity;
      activity["name"] = actName;
      activity["description"] = actDesc;
      //activity["rollableEvents"] = this.rollableEvents;
      activity["results"] = this.activity.results;
      activity["type"] = actType;
      activity["img"] = this.image;
      activity["complication"] = complication;
      activity["actPrivate"] = actPrivate;
      activity["compPrivate"] = compPrivate;
      activity["timeTaken"] = actTimeTaken;
      activity["rollIcon"] = actRollImage;
      activity["useMaterials"] = useMaterials;
      activity["rolls"] = this.rolls;
    }

    const actor = this.actor;
    // local scope
    if (!jQuery.isEmptyObject(actor)) {
      let flags = actor.getFlag("downtime-ethck", "trainingItems");
      if (!this.edit) {
        activity["world"] = false;
        // Update flags and actor
        flags.push(activity);
      }
      await actor.unsetFlag("downtime-ethck", "trainingItems")
      await actor.setFlag("downtime-ethck", "trainingItems", flags)
    // World scope
    } else {
      activity["world"] = true;
      const settings = game.settings.get("downtime-ethck", "activities");
      if (this.edit) {
        let act = settings.find((act) => act.id == activity.id);
        let idx = settings.indexOf(act);
        settings[idx] = activity;
      } else {
        settings.push(activity);
      }
      await game.settings.set("downtime-ethck", "activities", settings);
    }
  }
}
