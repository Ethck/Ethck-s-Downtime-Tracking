export class DWTForm extends FormApplication {
  constructor(actor = {}, activity = {}, editMode = false, ...args) {
    super(...args);
    game.users.apps.push(this);
    this.activity = activity;
    this.rollableEvents = activity["rollableEvents"] || [];
    this.results = activity["results"] || [];
    this.actor = actor;
    this.edit = editMode;
    this.image = activity["img"] || ""
  }

  static get defaultOptions() {
    const options = super.defaultOptions;
    if (this.edit) {
      options.title = "Edit a Downtime Activity";
    } else {
      options.title = "Add a Downtime Event";
    }
    options.id = "downtime-ethck";
    options.template =
      "modules/downtime-ethck/templates/add-downtime-form.html";
    options.closeOnSubmit = true;
    options.popOut = true;
    options.width = 600;
    options.height = "auto";
    return options;
  }

  async getData() {
    // Return data to the template
    const abilities = CONFIG.DND5E.abilities;
    const saves = CONFIG.DND5E.abilities;
    const skills = CONFIG.DND5E.skills;
    const tools = [
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
    ]

    const activity = this.activity;
    const tables = game.tables;
    const compChances = [10, 25, 50, 75, 100]

    return {
      abilities,
      saves,
      skills,
      tools,
      activity,
      tables,
      compChances
    };
  }

  render(force, context = {}) {
    // Only re-render if needed
    const { action, data } = context;
    return super.render(force, context);
  }

  activateListeners(html) {
    super.activateListeners(html);
    // Add Rollable
    this.element
      .find(".addRollable")
      .click((event) => this.handleRollables(event));
    // Handle deletes in table
    this.element
      .find("#rollableEventsTable > tbody > .rollableEvent")
      .on("click", "#deleteRollable", (event) =>
        this.handleRollableDelete(event)
      );
    // Add results
    this.element.find(".addResult").click((event) => this.handleResults(event));
    // Deletes on result(s)
    this.element
      .find("#resultsTable > tbody > .result")
      .on("click", "#deleteResult", (event) => this.handleResultDelete(event));
    // Picture picker
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

  handleRollableDelete(event) {
    // In the rollable table, handle removing elements
    event.preventDefault();
    const elem = $(event.currentTarget).parent().parent();
    const toDel = this.rollableEvents.find((rbl) => rbl[2] == elem.attr("id"));
    const idx = this.rollableEvents.indexOf(toDel);
    this.rollableEvents.splice(idx, 1);
    elem.remove();
  }

  async handleRollables(event) {
    // When adding a new roll
    event.preventDefault();
    // Setup DOM references
    const abiElem = this.element.find("#abiCheck");
    const saveElem = this.element.find("#saveSelect");
    const skiElem = this.element.find("#skiCheck");
    const toolElem = this.element.find("#toolSelect");
    const formulaElem = this.element.find("#rollFormula");
    const dcElem = this.element.find("#dc");
    // Get Vals
    const abi = abiElem.val();
    const save = saveElem.val();
    const ski = skiElem.val();
    const tool = toolElem.val();
    const formula = formulaElem.val();
    const dc = dcElem.val() || "";
    // Error Handling
    let rbl = "";

    if (abi !== "") {
      rbl = abi;
    } else if (save !== "") {
      rbl = save;
    } else if (ski !== "") {
      rbl = ski;
    } else if (tool !== ""){
      rbl = tool;
    } else if (formula !== ""){
      try {
        const roll = new Roll(formula) //ensure no error in formula
        rbl = "Formula: " + formula
      } catch (e) {
        ui.notifications.error(e);
      }
    }

    if (rbl === "") {
      ui.notifications.error("ERROR! Select a roll first!");
      return;
    }
    // End Errors
    // Get a unique ID
    const time = Date.now();
    // Add event
    this.rollableEvents.push([rbl, dc, time]);
    // Add the row that shows in the form (DOM!)
    this.element.find("#rollableEventsTable > tbody").append(
      `
            <tr id="` + time + `" class="rollableEvent">
                <td><label>` + rbl + `</label></td>
                <td><label>` + dc + `</label></td>
                <td><input type="text" id="group" placeholder="group name for rolls"></td>
                <td style="text-align:center;"><a class="item-control training-delete" id="deleteRollable" title="Delete">
                    <i class="fas fa-trash"></i></a>
                </td>
            </tr>`
    );
    // Attach new listener
    this.element
      .find("#rollableEventsTable > tbody > .rollableEvent")
      .on("click", "#deleteRollable", (event) =>
        this.handleRollableDelete(event)
      );

    //reset to initial vals
    abiElem.val($("#abiCheck option:first").val());
    saveElem.val($("#saveSelect option:first").val());
    skiElem.val($("#skiCheck option:first").val());
    toolElem.val($("#toolSelect option:first").val());
    formulaElem.val("")
    dcElem.val("");
  }

  handleResultDelete(event) {
    // Delete result
    event.preventDefault();
    const elem = $(event.currentTarget).parent().parent();
    const toDel = this.results.find((res) => res[3] == elem.attr("id"));
    const idx = this.results.indexOf(toDel);
    this.results.splice(idx, 1);
    elem.remove();
  }

  handleResults(event) {
    // Add result to table
    event.preventDefault();

    const minV = "0";
    const maxV = "5";
    const textV = "You win 5 cakes."
    // ID
    const time = Date.now();
    // Add event
    this.results.push([parseInt(minV), parseInt(maxV), textV, time]);
    // Add the row that shows in the form (DOM!)
    this.element.find("#resultsTable > tbody").append(
      `<tr id="` + time +`" class="result">
        <td><input style="margin: 5px;" value="`+ minV +`" type="text" id="rollStart"></input></td>
        <td><input style="margin: 5px;" value="` + maxV + `" type="text" id="rollEnd"></input></td>
        <td><input style="margin: 5px;" value="` + textV + `" type="text" id="rollDesc"></input></td>
        <td style="text-align:center;"><a class="item-control training-delete" id="deleteResult" title="Delete">
            <i class="fas fa-trash"></i></a>
        </td>
      </tr>`
    );

    this.element
      .find("#resultsTable > tbody > #" + time)
      .on("click", "#deleteResult", (event) => this.handleResultDelete(event));
  }

  async _updateObject(event, formData) {
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

    // Make the complication object with table and chance

    const complication = {
      table: {
        id: this.element.find("#complications").val(),
        name: this.element.find("#complications").text().trim()
      },
      chance: parseInt(this.element.find("#compchance").val())
    }


    // Override value of this.rollableEvents with the input in the form.
    this.rollableEvents = this.rollableEvents.map((rollableEvent) => {
      return [
        rollableEvent[0],
        this.element.find("#" + rollableEvent[2] + " > td > #dc").val(),
        rollableEvent[2]
      ];
    });

    // Handle OR grouping of rollableEvents
    let rollableGroups = [{ group: "", rolls: [] }];
    this.rollableEvents.forEach((rollableEvent) => {
      const groupVal = this.element
        .find("#" + rollableEvent[2] + " > td > #group")
        .val();
      rollableGroups.forEach((groupDict) => {
        if (groupDict["group"] == groupVal) {
          groupDict["rolls"].push(rollableEvent);
        }
      });

      if (
        rollableGroups.find((group) => group["group"] === groupVal) ===
        undefined
      ) {
        const groupDict = {
          group: groupVal,
          rolls: [rollableEvent],
        };

        rollableGroups.push(groupDict);
      }
    });

    // Add "new" values from the input fields so that changes are reflected.
    this.results = this.results.map((result) => {
      return[
        parseInt(this.element.find("#" + result[3] + " > td > #rollStart").val()),
        parseInt(this.element.find("#" + result[3] + " > td > #rollEnd").val()),
        this.element.find("#" + result[3] + " > td > #rollDesc").val(),
        result[3]
      ];
    });


    // Setup or update the values of our activity
    let activity = {};
    if (!this.edit) {
      activity = {
        name: actName || "New Downtime Activity",
        description: actDesc || "",
        changes: [],
        rollableEvents: this.rollableEvents,
        rollableGroups: rollableGroups,
        results: this.results,
        id: Date.now(),
        type: actType,
        img: this.image,
        complication: complication,
        actPrivate: actPrivate,
        compPrivate: compPrivate,
        actTimeTaken: actTimeTaken,
        rollIcon: actRollImage,
        useMaterials: useMaterials
      };
    } else {
      activity = this.activity;
      activity["name"] = actName;
      activity["description"] = actDesc;
      activity["rollableEvents"] = this.rollableEvents;
      activity["rollableGroups"] = rollableGroups;
      activity["results"] = this.results;
      activity["type"] = actType;
      activity["img"] = this.image;
      activity["complication"] = complication;
      activity["actPrivate"] = actPrivate;
      activity["compPrivate"] = compPrivate;
      activity["timeTaken"] = actTimeTaken;
      activity["rollIcon"] = actRollImage;
      activity["useMaterials"] = useMaterials;
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
