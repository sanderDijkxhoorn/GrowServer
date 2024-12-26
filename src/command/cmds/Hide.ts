import { Command } from "../Command";
import { Base } from "../../core/Base";
import { Peer } from "../../core/Peer";
import { ROLE } from "../../Constants";
import { Variant } from "growtopia.js";

export default class Hide extends Command {
  constructor(public base: Base, public peer: Peer, public text: string, public args: string[]) {
    super(base, peer, text, args);
    this.opt = {
      command: ["hide"],
      description: "Toggle to (un)hide yourself from the /online, /msg etc",
      cooldown: 5,
      ratelimit: 1,
      category: "`bDev",
      usage: "/hide",
      example: [],
      permission: [ROLE.DEVELOPER]
    };
  }

  public async execute(): Promise<void> {
    this.peer.data.hidden = !this.peer.data.hidden;
    this.peer.saveToCache();
    this.peer.saveToDatabase();

    this.peer.send(Variant.from("OnConsoleMessage", `You are now ${this.peer.data.hidden ? "hidden" : "visible"}`));
  }
}
