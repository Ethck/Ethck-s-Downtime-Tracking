// Imports
import AuditLog from "./audit-log.js";
import { DWTForm } from "./downtime.js";
import { GMConfig } from "./gmConfig.js";
import { ChooseRoll } from "./chooseRoll.js";
import { d20Roll } from "../../systems/dnd5e/module/dice.js";

// Register Game Settings
Hooks.once("init", () => {
  game.settings.registerMenu("downtime-ethck", "config", {
    name: "Config",
    label: "Access Config Menu",
    hint: "Access the configuration menu to find additional options.",
    icon: "fas fa-desktop",
    type: GMConfig,
    restricted: true,
  });

  game.settings.register("downtime-ethck", "enableTraining", {
    name: "Show Training Tab on PCs",
    hint: "Display the training tab for Player Characters",
    scope: "world",
    config: true,
    default: true,
    type: Boolean,
  });

  game.settings.register("downtime-ethck", "enableTrainingNpc", {
    name: "Show Training Tab on NPCs",
    hint: "Display the training tab for Non-Player Characters",
    scope: "world",
    config: true,
    default: true,
    type: Boolean,
  });

  game.settings.register("downtime-ethck", "aboutTimeCompat", {
    name: "Enable About Time Compatibility",
    hint: "Allows for About Time month/day to appear in Activity Log",
    scope: "world",
    config: true,
    default: false,
    type: Boolean
  });

  game.settings.register("downtime-ethck", "crashCompat", {
    name: "Enable Compatibility for Crash's 5e Downtime Tracking",
    hint: "Allows for Crash's Downtime and this module to reside in the same tab.",
    scope: "world",
    config: true,
    default: true,
    type: Boolean
  });

  game.settings.register("downtime-ethck", "tabName", {
    name: "Tab Name",
    hint: "Name for the custom downtime tab",
    scope: "world",
    config: true,
    default: "Downtime",
    type: String,
  });

  game.settings.register("downtime-ethck", "dcRollMode", {
    name: "DC Roll Mode",
    hint: "Roll Mode used when downtime activities' DCs are called",
    scope: "world",
    config: true,
    type: String,
    choices: {
      gmroll: "GM Roll (Player can see)",
      blindroll: "Blind Roll (Player can't see)",
    },
    default: "blindroll",
  });

  game.settings.register("downtime-ethck", "activities", {
    scope: "world",
    config: false,
    default: [],
  });

  game.settings.register("downtime-ethck", "changes", {
    scope: "world",
    config: false,
    default: {},
  });

  game.settings.register("downtime-ethck", "migrated", {
    scope: "world",
    config: false,
    default: {status: false, version: "0.3.3"}
  })
});

Hooks.once("ready", () => {
  _downtimeMigrate();
})

// The Meat And Potatoes
async function addTrainingTab(app, html, data) {
  // Determine if we should show the downtime tab
  let showTrainingTab = false;
  if (data.isCharacter) {
    showTrainingTab = game.settings.get("downtime-ethck", "enableTraining");
  } else if (data.isNPC) {
    showTrainingTab = game.settings.get("downtime-ethck", "enableTrainingNpc");
  }

  if (showTrainingTab) {
    // Get our actor
    let actor = game.actors.entities.find((a) => a.data._id === data.actor._id);
    // Make sure flags exist if they don't already
    if (
      actor.data.flags["downtime-ethck"] === undefined ||
      actor.data.flags["downtime-ethck"] === null
    ) {
      await actor.setFlag("downtime-ethck", "trainingItems", [])
      await actor.setFlag("downtime-ethck", "changes", [])
    }

    let flags = actor.getFlag("downtime-ethck", "trainingItems")

    let CRASH_COMPAT = false;
    const crash5eTraining = game.modules.get("5e-training")

    if (crash5eTraining !== undefined && crash5eTraining.active === true && game.settings.get("downtime-ethck", "crashCompat")) {
      // 0.4.6 changed how the tab is rendered, so our new logic requires this (10/23/2020)
      if (isNewerVersion(crash5eTraining.data.version, "0.4.6")) { // version must be GREATER to return true.
        CRASH_COMPAT = true;
      } else {
        ui.notifications.warn("Please update Crash's 5e Downtime Tracking to version 0.4.7 or greater to enable compaitbility.")
      }
    } else {
      // Update the nav menu
      let tabName = game.settings.get("downtime-ethck", "tabName");
      let trainingTabBtn = $(
        '<a class="item" data-tab="downtime">' + tabName + "</a>"
      );
      let tabs = html.find('.tabs[data-group="primary"]');

      if(!(tabs.find('.item[data-tab="downtime"]').length)){ //Prevent addition of tab more than once
        tabs.append(trainingTabBtn);
      }
    }

    const skills = CONFIG.DND5E.skills;

    // Create the tab content
    let sheet = html.find(".sheet-body");

    // Compile our template
    let ethckDowntimeTabHtml = $(
      await renderTemplate(
        "modules/downtime-ethck/templates/training-section.html",
        {
          activities: game.settings.get("downtime-ethck", "activities"),
          actorAct: data,
          isGM: game.user.isGM,
        }
      )
    );

    // attach to sheet
    let downtimeHTML = await compileDowntimeTab(CRASH_COMPAT, ethckDowntimeTabHtml, sheet);

    // Add New Downtime Activity
    downtimeHTML.find(".activity-add").click(async (event) => {
      event.preventDefault();
      let form = new DWTForm(actor);
      form.render(true);
      fixActiveTab(app, CRASH_COMPAT)
    });

    // Edit Downtime Activity
    downtimeHTML.find(".activity-edit").click(async (event) => {
      event.preventDefault();

      // Set up some variables
      let fieldId = event.currentTarget.id;
      let trainingIdx = parseInt(fieldId.replace("ethck-edit-", ""));
      let activity = flags[trainingIdx];
      let form = new DWTForm(actor, activity, true);
      form.render(true);
      fixActiveTab(app, CRASH_COMPAT)
    });

    // Remove Downtime Activity
    downtimeHTML.find(".activity-delete").click(async (event) => {
      event.preventDefault();

      // Set up some variables
      let fieldId = event.currentTarget.id;
      let trainingIdx = parseInt(fieldId.replace("ethck-delete-", ""));
      let activity = flags[trainingIdx];
      let del = false;
      let dialogContent = await renderTemplate(
        "modules/downtime-ethck/templates/delete-training-dialog.html"
      );

      // Create dialog
      new Dialog({
        title: `Delete Downtime Activity`,
        content: dialogContent,
        buttons: {
          yes: {
            icon: "<i class='fas fa-check'></i>",
            label:"Delete",
            callback: () => (del = true),
          },
          no: {
            icon: "<i class='fas fa-times'></i>",
            label: "Cancel",
            callback: () => (del = false),
          },
        },
        default: "yes",
        close: async (html) => {
          if (del) {
            // Delete item and update actor
            flags.splice(trainingIdx, 1);
            await actor.unsetFlag("downtime-ethck", "trainingItems")
            await actor.setFlag("downtime-ethck", "trainingItems", flags)
            fixActiveTab(app, CRASH_COMPAT)
          }
        },
      }).render(true);
    });

    // Roll Downtime Activity
    downtimeHTML.find(".activity-roll").click(async (event) => {
      event.preventDefault();

      let fieldId = event.currentTarget.id;
      let trainingIdx = parseInt(fieldId.replace("ethck-roll-", ""));
      let activity = {};

      // Get our activity given the selected roll
      if ($(event.currentTarget).hasClass("localRoll")) {
        activity = flags[trainingIdx];
      } else if ($(event.currentTarget).hasClass("worldRoll")) {
        activity = game.settings.get("downtime-ethck", "activities")[trainingIdx];
      }

      const materials = await materialsPrompt(activity);

      let res = [];

      let rolls = [];
      if (activity.rollableGroups.every((rg) => rg.rolls.length <= 1)){ //No ORs in activity
        activity.rollableGroups.forEach((group) => {
          if (group.rolls.length >= 1){
            rolls.push(group.rolls[0])
          }
        });
      } else { // Some ORs in Activity
        let form = new ChooseRoll(actor, activity)
        const choices = await form.chooseRollDialog();
        for (let rg of activity.rollableGroups){
          for (let c of choices){
            const choice = rg.rolls.find((roll) => roll[2] === c)
            if (choice !== undefined){
              rolls.push(choice)
              break;
            }
          }
        }
      }

      try {
        // wait for rollRollable to roll these
        let rollRes = rolls.map(async (roll) => {
          return await rollRollable(actor, activity, roll);
        })
        res.push(...await Promise.all(rollRes))
        // output results
        outputRolls(actor, activity, event, trainingIdx, res, materials);
      } catch (e) {
        console.log(e);
      }

  });

    // Toggle Information Display
    // Modified version of _onItemSummary from dnd5e system located in
    // dnd5e/module/actor/sheets/base.js
    downtimeHTML.find(".activity-toggle-desc").click(async (event) => {
      event.preventDefault();
      // Set up some variables
      //let flags = actor.data.flags["downtime-ethck"];
      let fieldId = event.currentTarget.id;
      let trainingIdx = parseInt(fieldId.replace("ethck-toggle-desc-", ""));
      let activity = {};

      if ($(event.currentTarget).hasClass("localRoll")) {
        activity = flags[trainingIdx];
      } else if ($(event.currentTarget).hasClass("worldRoll")) {
        activity = game.settings.get("downtime-ethck", "activities")[
          trainingIdx
        ];
      }

      let desc = "";
      for (let rollable of activity.rollableEvents) {
        desc += rollable[0] + " DC: " + rollable[1] + "</br>";
      }

      let li = $(event.currentTarget).parents(".item");

      if (li.hasClass("expanded")) {
        let summary = li.children(".item-summary");
        summary.slideUp(200, () => summary.remove());
      } else {
        let div = $(
          `<div class="item-summary"><label>` + desc + `</label></div>`
        );
        li.append(div.hide());
        div.slideDown(200);
      }
      li.toggleClass("expanded");
    });

    // Review Changes
    downtimeHTML.find(".activity-log").click(async (event) => {
      event.preventDefault();
      new AuditLog(actor).render(true);
    });

    // Edit world level downtime activities
    downtimeHTML.find(".edit-world").click(async (event) => {
      event.preventDefault();
      new GMConfig().render(true);
    })

    // Set Training Tab as Active
    downtimeHTML.find('.tabs .item[data-tab="downtime"]').click((ev) => {
      app.activateDowntimeTab = true;
    });

    // Unset Training Tab as Active
    downtimeHTML.find('.tabs .item:not(.tabs .item[data-tab="downtime"])')
      .click((ev) => {
        app.activateDowntimeTab = false;
      });
  }
}

Hooks.on(`renderActorSheet`, (app, html, data) => {
  addTrainingTab(app, html, data).then(function () {
    if (app.activateDowntimeTab) {
      app._tabs[0].activate("downtime");
    }
  });
});

async function outputRolls(actor, activity, event, trainingIdx, res, materials){
  let cmsg = "";
  let cmsgResult = "";

  if (activity.type === "succFail") {
    let booleanResults = [0, 0];
    res.map((pair) => {
      if (pair[0] >= pair[1]) {
        //Rolled is greater than dc
        booleanResults[0] += 1;
      } else {
        //Rolled is less than dc
        booleanResults[1] += 1;
      }
    });

    cmsg =
      "With " +
      booleanResults[0] +
      " successes and " +
      booleanResults[1] +
      " failures.";
    activity.results.forEach((result) => {
      if (
        result[0] <= booleanResults[0] &&
        result[1] >= booleanResults[0]
      ) {
        cmsgResult = result[2];
      }
    });
  } else if (activity.type === "categories") {
    activity.results.forEach((result) => {
      if (res[0][0] >= result[0] && res[0][0] <= result[1]) {
        cmsgResult = result[2];
      }
    });
  } else if (activity.type === "noRoll") {
    // Do Nothing
  }

  // Add in materials, if any.
  cmsg = materials ? cmsg + "\n Used " + materials : cmsg;

  const cmsgTemplate = await renderTemplate("modules/downtime-ethck/templates/chatMessage.html", {img: activity.img, text: cmsg, result: cmsgResult})

  // Determine if we whisper this message, and who to
  const cmsgVis = activity.actPrivate || game.settings.get("core", "rollMode");
  const gmUserIds = game.data.users.filter((user) => user.role === 4).map((gmUser) => gmUser._id)

  // Results message
  ChatMessage.create({
    user: game.user._id,
    speaker: ChatMessage.getSpeaker({actor}),
    content: cmsgTemplate,
    flavor: "has completed the downtime activity of " + activity.name,
    type: CONST.CHAT_MESSAGE_TYPES.IC,
    // Current user + all gm users
    whisper: cmsgVis ? [game.user._id, ...gmUserIds] : []
  });

  // Test if complications are being used
  if (activity.complication !== undefined && (activity.complication.chance !== " " || activity.complication.table !== " ")){
    const num = Math.floor(Math.random() * 100) + 1 // 1-100
    if (num <= activity.complication.chance){
      // Complication has occured
      let tableRes = null;
      if ("id" in activity.complication.table) { // New Style
        tableRes = game.tables.get(activity.complication.table.id);
      }
      // Also outputs chat message, YAY!
      let opts = {};
      if (activity.compPrivate === true){
        opts["rollMode"] = "blindroll";
      }
      tableRes.draw(opts)
    }
  }

  let timestamp = Date.now()

  // About Time Compat TIME
  if (game.settings.get("downtime-ethck", "aboutTimeCompat")) {
    const aboutTime = game.modules.get("about-time")
    if (aboutTime !== undefined && aboutTime.active === true){
      timestamp = game.Gametime.DTNow().longDate().date;
    }
  } else {
    timestamp = new Date(timestamp).toDateString()
  }

  // Activity log format
  const change = {
    timestamp: timestamp,
    user: game.user.name,
    activityName: activity.name,
    result: cmsgResult,
    timeTaken: activity.timeTaken,
    materials: materials
  }

  // Handle flags
  let flags = actor.getFlag("downtime-ethck", "changes");
  if (!flags) flags = [];
  flags.push(change)
  await actor.unsetFlag("downtime-ethck", "changes")
  await actor.setFlag("downtime-ethck", "changes", flags)
}

/*
  Just make a quick simple roll (typically hidden) to find the DC, if needed. 

  return: Roll()
*/
async function rollDC(rollable) {
  if (!rollable[1]) return {_total: 0}; // If no DC, return fake total (it doesn't matter...)
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

/*
  For each given roll, determine the type (check, save, formula, tool, skill)
  then construct our roll, roll it, then roll the DC. res is [rollTotal, dcTotal]
  and used to calculate the overall results. This is wrapped in a promise mainly for
  enabling awaits of Dice So Nice animations (see diceSoNiceRollComplete hook).

  return: [rollTotal, dcTotal]
*/
async function rollRollable(actor, activity, rollable) {
  return new Promise(async (resolve, reject) => {
    const abilities = ["str", "dex", "con", "int", "wis", "cha"];
    const skills = CONFIG.DND5E.skills;
    let res = []
    const toolFilters = ["Tool", "Supplies", "Kit", "Instrument", "Utensils", "Set"]

    // STRENGTH, DEXTERITY, CONSTITUTION, INTELLIGENCE, WISDOM, CHARISMA CHECK
    if (rollable[0].includes("Check")) {
      let abiAcr = abilities.find((abi) =>
        rollable[0].toLowerCase().includes(abi)
      );
      await actor.rollAbilityTest(abiAcr).then(async (r) => {
        const dc = await rollDC(rollable);
        res = [r._total, dc._total];
      });
    // STRENGTH, DEXTERITY, CONSTITUTION, INTELLIGENCE, WISDOM, CHARISMA SAVING THROW
    } else if (rollable[0].includes("Saving Throw")) {
      let abiAcr = abilities.find((abi) =>
        rollable[0].toLowerCase().includes(abi)
      );
      await actor.rollAbilitySave(abiAcr).then(async (r) => {
        const dc = await rollDC(rollable);
        res = [r._total, dc._total];
      });
    // includes ["Tool", "Supplies", "Kit", "Instrument", "Utensils", "Set"] in name
    } else if (toolFilters.some((filter) => rollable[0].includes(filter))) {
      let actorTool;
      if (rollable[0].includes("Instrument")){
        const actorTools = actor.items.filter((item) => item.type === "tool" && item.data.name.includes("Instrument"))
        let musicActivity = {
          rollableGroups: [{
            group: "",
            rolls: actorTools.map((tool, index) => [tool.data.name, rollable[1], index])
          }]
        }
        let form = new ChooseRoll(actor, musicActivity)
        const choice = await form.chooseRollDialog();
        const toolName = musicActivity.rollableGroups[0].rolls.find((roll) => roll[2] === choice[0])[0]
        actorTool = actor.items.find((item) => item.data.name === toolName)
      } else {
        actorTool = actor.items.find((item) => item.type === "tool" && item.data.name.toLowerCase() == rollable[0].toLowerCase());
      }

      if (actorTool !== null) {
        await actorTool.rollToolCheck().then(async (r) => {
          const dc = await rollDC(rollable);
          res = [r._total, dc._total];
        })
      } else {
        // No tool of that name found.
        ui.notifications.error("Tool with name " + rollable[0] + " not found. Please ensure the name is correct.");
        res = [];
      }
    // Special formulas
    } else if (rollable[0].includes("Formula:")) {
      
      let dRoll = await formulaRoll(rollable[0].split("Formula: ")[1].split(" + "), actor)
      const dc = await rollDC(rollable);
      res = [dRoll._total, dc._total];
    // We must be at skills...
    } else {
      let skillAcr = Object.keys(skills).find((key) =>
        skills[key].toLowerCase().includes(rollable[0].toLowerCase())
      );

      // The Skill Custimization 5e module patches actor.rollSkill and makes it NOT be a promise
      // so we have to handle it differently.
      let skillCust = game.modules.get("skill-customization-5e");
      let r = null;
      if (skillCust && skillCust.active){
        r = await _skillCustHandler(skillAcr, actor, rollable[0]);
      } else {
        r = await actor.rollSkill(skillAcr)
      }

      const dc = await rollDC(rollable);
      res = [r._total, dc._total];
    }

    // For some reason, we don't have a roll or a dc roll...
    if (res.length === 0) {
      throw "Ethck's Downtime Tracking | Error on rolling."
      reject();
    }

    if (game.dice3d) { // If dice so nice is being used, wait till 1st animation is over.
      Hooks.once('diceSoNiceRollComplete', (messageId) => {
        resolve(res);
      });
    // no DSN, just normal.
    } else {
      resolve(res);
    }
  });
}


async function compileDowntimeTab(CRASH_COMPAT, ethckDowntimeTabHtml, sheet) {
  return new Promise((resolve, reject) => {
    // Add our HTML nicely...
    if (CRASH_COMPAT === true && game.settings.get("downtime-ethck", "crashCompat")) {
        ethckDowntimeTabHtml = ethckDowntimeTabHtml.find(".inventory-list").unwrap();
        Hooks.on(`CrashTrainingTabReady`, async (app2, html2, data2) => {
            let crash5eTrainingHtml = html2.find(".crash-training");
            crash5eTrainingHtml.find(".ethck-downtime").remove() //Remove Old
            crash5eTrainingHtml.append(ethckDowntimeTabHtml); // Add New
            crash5eTrainingHtml.find(".inventory-list").wrapAll('<ol class="inventory-list"></ol>')
            resolve(crash5eTrainingHtml);
        });
      } else {
        sheet.append(ethckDowntimeTabHtml)
        resolve(sheet);
      }
  });
}

// Weird bug with our tab not being activated after submitting forms.
function fixActiveTab(app, CRASH_COMPAT) {
  if (!CRASH_COMPAT) {
    app.activateDowntimeTab = true;
  }
}

async function materialsPrompt(activity) {
  return new Promise((resolve, reject) => {
    if (!("useMaterials" in activity) || !activity.useMaterials) {
      resolve("");
    } else {
      new Dialog({
            title: `Enter Material Costs`,
            content: `<input type="text" placeholder="20gp" id="materials"/>`,
            buttons: {
              submit: {
                icon: "<i class='fas fa-check'></i>",
                label:"Submit",
              },
            },
            default: "submit",
            close: async (html) => {
              resolve(html.find("#materials").val());
            },
      }).render(true);
    }
  });
}

// Roll our custom formula
async function formulaRoll(formula, actor) {
  return new Promise(async (resolve, reject) => {
    // dRoll is the type (adv., norm, disadv.)
    // dForm is the HTML of the dialog.
    let [dRoll, dForm] = await _formulaDialog(formula);
    // get our bonus
    let bonus = $(dForm).find('input[name="bonus"]').val();
    if (bonus) {
      // destructure our array
      formula.push(...bonus.split(" + "));
    }
    // only supports 1dX rolls by making them 2dX
    if (parseInt(formula[0].split("d")[0]) === 1){
      let mods = "";
      if (dRoll !== 0) {
        if (dRoll === 1) {
          mods += "kh"; // Advantage
        } else {
          mods += "kl"; // Disadvantage
        }

        let firstTerms = formula[0].split("d");
        let newFirst = "2d" + firstTerms[1];
        formula[0] = newFirst + mods;
      }
    }
    // make the roll, providing a reference to actor
    let context = mergeObject({actor: actor}, actor.getRollData());
    let myRoll = new Roll(formula.join(" + "), context);
    myRoll.roll();
    await myRoll.toMessage();
    // we're done!
    resolve(myRoll);
  });
}

// slightly reworked _d20RollDialog from the d&d5e system
// formula is an array of parts
async function _formulaDialog(formula) {
  return new Promise(async (resolve, reject) => {
    let rollTemplate = await renderTemplate("systems/dnd5e/templates/chat/roll-dialog.html", {
      formula: formula.join(" + "),
      rollModes: CONFIG.Dice.rollModes,
    })
    new Dialog({
        title: "Custom Formula Roll",
        content: rollTemplate,
        buttons: {
          advantage: {
            label: game.i18n.localize("DND5E.Advantage"),
            callback: event => resolve([1, event])
          },
          normal: {
            label: game.i18n.localize("DND5E.Normal"),
            callback: event => resolve([0, event])
          },
          disadvantage: {
            label: game.i18n.localize("DND5E.Disadvantage"),
            callback: event => resolve([-1, event])
          }
        },
        default: "normal",
        close: () => resolve(null)
      }).render(true);
  });
}

async function _skillCustHandler(skillAcr, actor, skiname){
  return new Promise(async (resolve, reject) => {
    actor.rollSkill(skillAcr); // call the patched function
    // only way to know it's done is by the final chat message, so listen for it
    Hooks.on("createChatMessage", async (message, options, id) => {
      // discard if not a roll
      if (message.isRoll) {
        // make sure it's our expected Skill Check
        if ((getProperty(message, "data.flavor") && getProperty(message, "data.flavor").includes(skiname + " Skill Check"))) {
          // return the roll
          resolve(message._roll);
        }
      }
    });
  })
}

async function _downtimeMigrate(){
  if (!game.user.isGM) return;
  //await game.settings.set("downtime-ethck", "migrated", false);
  const NEEDS_MIGRATION_VERSION = "0.3.4";
  // Updating from old install -> Migrated
  // Fresh install -> No migration CHECK
  // Skipped multiple versions and upgrading in 0.4.X or higher
  // X round of migrations (bound to happen again, right?)
  let migrated = game.settings.get("downtime-ethck", "migrated");
  // If we have migrated before
  if (migrated.status) {
    // If our version is newer than the NEEDS_MIGRATION_VERSION
    if (isNewerVersion(game.modules.get("downtime-ethck").data.version, NEEDS_MIGRATION_VERSION)) return;
    // If we are on the same version, but have migrated.
    if (migrated.version === NEEDS_MIGRATION_VERSION) return;
  }

  ui.notifications.notify("Ethck's 5e Downtime Tracking | Beginning Migration to updated schema.")

  // Update Actor Flags
  game.actors.forEach(async (actor) => {
    // If it doesn't have our flags, idc
    let downtimes = actor.getFlag("downtime-ethck", "trainingItems");
    if (!downtimes) return;
    let changed = false;
    [downtimes, changed] = await _updateDowntimes(downtimes);
    if (changed){
      let update = {
        id: actor._id,
        "flags.downtime-ethck": {trainingItems: downtimes}
      }

      await actor.update(update, {enforceTypes: false})
    }
  })

  let worldDowntimes = game.settings.get("downtime-ethck", "activities");
  if (worldDowntimes) {
    let changed = false;
    [worldDowntimes, changed] = await _updateDowntimes(worldDowntimes);
    await game.settings.set("downtime-ethck", "activities", worldDowntimes);
  }
  
  ui.notifications.notify("Ethck's 5e Downtime Tracking | Migration Complete.")
  await game.settings.set("downtime-ethck", "migrated", {status: true, version: NEEDS_MIGRATION_VERSION});
}

async function _updateDowntimes(downtimes) {
  let changed = false;
  downtimes.forEach(async (downtime) => {
    // Handle old private
    if ("private" in downtime) {
      // If previously updated, the "new" value might be here
      if (!("actPrivate" in downtime)) {
        downtime.actPrivate = downtime.private;
      }

      delete downtime.private;
      changed = true;
    }

    // Update tables, might not be present?
    if ("complication" in downtime) {
      if ("table" in downtime.complication) {
        // Old format where table was the string id of the table
        if (typeof downtime.complication.table === "string" || downtime.complication.table instanceof String) {
          let tid = "";
          if (downtime.complication.table !== "") {
            let table = game.tables.getName(downtime.complication.table);
            if (!table) table = game.tables.get(downtime.complication.table);
            tid = table._id;
          }
          downtime.complication.table = {id: tid};
          changed = true;
        }
      }
    }

    if ("rollableGroups" in downtime){
      let newRolls = downtime.rollableGroups.flatMap((group) => {
        if (group.rolls.length === 0) return;
        let g = group.group;
        let rolls = group.rolls.map((roll) => {
          // new format is an object
          if (!Array.isArray(roll)) return;
          let typeRoll = determineOldType(roll); // Determine type
          let dc = roll[1] || 0; // Use old DC, or default to 0
          let id = randomID(); // generate new ID
          let rollVal = roll[0];

          if (typeRoll === "custForm") {
            rollVal = rollVal.split("Formula: ")[1];
          } else if (typeRoll === "skiCheck") {
            let skills = CONFIG.DND5E.skills;
            // returns shorthand of skill
            rollVal = Object.keys(skills).find((key) => skills[key] === rollVal);
          } else if (typeRoll === "toolCheck"){

          } else { //abiCheck, save
            if (typeRoll === "abiCheck") {
              rollVal = rollVal.split(" Check")[0];
            } else {
              rollVal = rollVal.split(" Saving Throw")[0];
            }
            let abilities = CONFIG.DND5E.abilities;
            // Returns shorthand of ability
            rollVal = Object.keys(abilities).find((key) => abilities[key] === rollVal).toLowerCase();
          }
          changed = true;
          return {type: typeRoll, dc: dc, id: id, group: g, val: rollVal}
        });

        return rolls;

      });
      newRolls = newRolls.filter(Boolean);
      downtime.rolls = newRolls;
    }

    if ("results" in downtime) {
      // downtime.results[0] old format is an array
      // new format is object
      if (Array.isArray(downtime.results[0])) {
        let res = duplicate(downtime.results);

        let newRes = res.map((result) => {
          return {
            min: result[0], // lower bound
            max: result[1], // high bound
            details: result[2], // description
            id: randomID() //some unique thingamabob
          }
        });

        downtime.results = newRes;
        changed = true;
      }
    }
  })

  return [downtimes, changed];
}

function determineOldType(roll) {
    const abilities = ["str", "dex", "con", "int", "wis", "cha"];
    const skills = CONFIG.DND5E.skills;
    const toolFilters = ["Tool", "Supplies", "Kit", "Instrument", "Utensils", "Set"]

    // STRENGTH, DEXTERITY, CONSTITUTION, INTELLIGENCE, WISDOM, CHARISMA CHECK
    if (roll[0].includes("Check")) {
      return "abiCheck";
    // STRENGTH, DEXTERITY, CONSTITUTION, INTELLIGENCE, WISDOM, CHARISMA SAVING THROW
    } else if (roll[0].includes("Saving Throw")) {
      return "save";
    // includes ["Tool", "Supplies", "Kit", "Instrument", "Utensils", "Set"] in name
    } else if (toolFilters.some((filter) => roll[0].includes(filter))) {
      return "toolCheck";
    // Special formulas
    } else if (roll[0].includes("Formula:")) {
      return "custForm";
    // We must be at skills...
    } else {
      return "skiCheck";
    }
  }