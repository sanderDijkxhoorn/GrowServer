import { Variant, TankPacket, TextPacket } from "growsockets";
import { Listener } from "../abstracts/Listener";
import { ActionType } from "../types/action";
import { BaseServer } from "../structures/BaseServer";
import { DataTypes } from "../utils/enums/DataTypes";
import { decrypt, find, parseAction } from "../utils/Utils";
import { Peer } from "../structures/Peer";
import { TankTypes } from "../utils/enums/TankTypes";
import { WORLD_SIZE } from "../utils/Constants";
import { ActionTypes } from "../utils/enums/Tiles";
import { handlePlace } from "../tanks/Place";
import { handlePunch } from "../tanks/Punch";
import { ClothTypes } from "../utils/enums/ItemTypes";

export default class extends Listener<"data"> {
  constructor() {
    super();
    this.name = "data";
  }

  private failGuest(peer: Peer) {
    peer.send(
      Variant.from(
        "OnConsoleMessage",
        "`4Unable to logon:`` Seems like you're on a guest account. Please register an account first from our website."
      ),
      TextPacket.from(
        DataTypes.ACTION,
        "action|set_url",
        `url|https://127.0.0.1/register`,
        "label|`$Create `9new`` Account``"
      )
    );
    peer.disconnect();
  }

  public async run(base: BaseServer, netID: number, data: Buffer): Promise<void> {
    // prettier-ignore
    const peer = base.cache.users.has(netID) ? base.cache.users.get(netID)! : new Peer(base.server, netID, base);
    const dataType = data.readInt32LE();

    switch (dataType) {
      case DataTypes.STR:
      case DataTypes.ACTION: {
        let parsed = parseAction(data);

        console.log({ parsed, dataType });

        // Guest
        if (parsed?.requestedName && !parsed?.tankIDName && !parsed?.tankIDPass)
          return this.failGuest(peer);

        // Using login & password
        if (parsed?.requestedName && parsed?.tankIDName && parsed?.tankIDPass) {
          const username = parsed.tankIDName as string;
          const password = parsed.tankIDPass as string;
          base.database.getUser(username).then((user) => {
            if (!user || password !== decrypt(user?.password!)) {
              peer.send(
                Variant.from(
                  "OnConsoleMessage",
                  "`4Failed`` logging in to that account. Please make sure you've provided the correct info."
                )
              );
              peer.send(
                TextPacket.from(
                  DataTypes.ACTION,
                  "action|set_url",
                  `url||https://127.0.0.1/recover`,
                  "label|`$Recover your Password``"
                )
              );
              return peer.disconnect();
            }

            // Check if there's same account is logged in
            const targetPeer = find(base.cache.users, (v) => v.data.id_user === user.id_user);
            if (targetPeer) {
              peer.send(
                Variant.from(
                  "OnConsoleMessage",
                  "`4Already Logged In?`` It seems that this account already logged in by somebody else."
                )
              );

              targetPeer.disconnect();
            }
            peer.send(
              Variant.from(
                "OnSuperMainStartAcceptLogonHrdxs47254722215a",
                base.items.hash,
                "ubistatic-a.akamaihd.net",
                "0098/654975/cache/",
                "cc.cz.madkite.freedom org.aqua.gg idv.aqua.bulldog com.cih.gamecih2 com.cih.gamecih com.cih.game_cih cn.maocai.gamekiller com.gmd.speedtime org.dax.attack com.x0.strai.frep com.x0.strai.free org.cheatengine.cegui org.sbtools.gamehack com.skgames.traffikrider org.sbtoods.gamehaca com.skype.ralder org.cheatengine.cegui.xx.multi1458919170111 com.prohiro.macro me.autotouch.autotouch com.cygery.repetitouch.free com.cygery.repetitouch.pro com.proziro.zacro com.slash.gamebuster",
                "proto=179|choosemusic=audio/mp3/jazz_loop.mp3|active_holiday=0|wing_week_day=0|ubi_week_day=0|server_tick=76098085|clash_active=0|drop_lavacheck_faster=1|isPayingUser=0|usingStoreNavigation=1|enableInventoryTab=1|bigBackpack=1|proto=179|choosemusic=audio/mp3/jazz_loop.mp3|active_holiday=17|wing_week_day=0|ubi_week_day=0|server_tick=3021347|clash_active=1|drop_lavacheck_faster=1|isPayingUser=0|usingStoreNavigation=1|enableInventoryTab=1|bigBackpack=1|"
              ),
              Variant.from("SetHasGrowID", 1, user.name, decrypt(user.password))
            );

            const defaultInventory = {
              max: 32,
              items: [
                {
                  id: 18, // Fist
                  amount: 1
                },
                {
                  id: 32, // Wrench
                  amount: 1
                }
              ]
            };

            const defaultClothing = {
              hair: 0,
              shirt: 0,
              pants: 0,
              feet: 0,
              face: 0,
              hand: 0,
              back: 0,
              mask: 0,
              necklace: 0,
              ances: 0
            };

            peer.data.tankIDName = user.name;
            // peer.data.requestedName = parsed.requestedName as string;
            peer.data.country = parsed?.country as string;
            peer.data.id_user = user.id_user;
            peer.data.role = user.role;
            // prettier-ignore
            peer.data.inventory = user.inventory?.length ? JSON.parse(user.inventory.toString()) : defaultInventory;
            // prettier-ignore
            peer.data.clothing = user.clothing?.length ? JSON.parse(user.clothing.toString()) : defaultClothing;
            peer.data.gems = user.gems?.length ? parseInt(user.gems!) : 0;
            peer.data.world = "EXIT";
            peer.saveToCache();
            peer.saveToDatabase();
          });
        }

        // Handle actions
        if (parsed?.action) {
          try {
            const action = base.action.get(parsed.action as string);
            action?.handle(base, peer.getSelfCache()!, parsed as ActionType<unknown>);
          } catch (err) {
            console.log(err);
          }
        }
        break;
      }

      case DataTypes.TANK: {
        if (data.length < 60) {
          peer.send(Variant.from("OnConsoleMessage", "Received invalid tank packet."));
          return peer.disconnect();
        }
        const tank = TankPacket.fromBuffer(data);

        // console.log(tank);
        switch (tank.data?.type) {
          // case TankTypes.PEER_ICON: {
          //   peer.everyPeer(
          //     (p) => p.data.world === peer.data.world && p.data.world !== "EXIT" && p.send(tank)
          //   );
          // }

          case TankTypes.PEER_CLOTH: {
            const item = base.items.metadata.items.find((v) => v.id === tank.data?.info);

            switch (item?.bodyPartType) {
              case ClothTypes.HAIR: {
                if (peer.data.clothing!.hair === tank.data.info!) peer.data.clothing!.hair = 0;
                else peer.data.clothing!.hair = tank.data.info!;

                break;
              }
              case ClothTypes.SHIRT: {
                if (peer.data.clothing!.shirt === tank.data.info!) peer.data.clothing!.shirt = 0;
                else peer.data.clothing!.shirt = tank.data.info!;

                break;
              }
              case ClothTypes.PANTS: {
                if (peer.data.clothing!.pants === tank.data.info!) peer.data.clothing!.pants = 0;
                else peer.data.clothing!.pants = tank.data.info!;

                break;
              }
              case ClothTypes.FEET: {
                if (peer.data.clothing!.feet === tank.data.info!) peer.data.clothing!.feet = 0;
                else peer.data.clothing!.feet = tank.data.info!;

                break;
              }
              case ClothTypes.FACE: {
                if (peer.data.clothing!.face === tank.data.info!) peer.data.clothing!.face = 0;
                else peer.data.clothing!.face = tank.data.info!;

                break;
              }
              case ClothTypes.HAND: {
                if (item.type === 107) {
                  if (peer.data.clothing!.ances === tank.data.info!) peer.data.clothing!.ances = 0;
                  else peer.data.clothing!.ances = tank.data.info!;
                  break;
                }

                if (peer.data.clothing!.hand === tank.data.info!) peer.data.clothing!.hand = 0;
                else peer.data.clothing!.hand = tank.data.info!;

                break;
              }
              case ClothTypes.BACK: {
                if (peer.data.clothing!.back === tank.data.info!) peer.data.clothing!.back = 0;
                else peer.data.clothing!.back = tank.data.info!;

                break;
              }
              case ClothTypes.MASK: {
                if (peer.data.clothing!.mask === tank.data.info!) peer.data.clothing!.mask = 0;
                else peer.data.clothing!.mask = tank.data.info!;

                break;
              }
              case ClothTypes.NECKLACE: {
                if (peer.data.clothing!.necklace === tank.data.info!)
                  peer.data.clothing!.necklace = 0;
                else peer.data.clothing!.necklace = tank.data.info!;

                break;
              }
              case ClothTypes.ANCES: {
                if (peer.data.clothing!.ances === tank.data.info!) peer.data.clothing!.ances = 0;
                else peer.data.clothing!.ances = tank.data.info!;

                break;
              }
            }

            peer.saveToCache();
            peer.saveToDatabase();
            peer.sendClothes();
            // handle equip cloth here
          }

          case TankTypes.PEER_MOVE: {
            tank.data.netID = peer.data.netID;
            tank.data.type = TankTypes.PEER_MOVE;

            peer.data.x = tank.data.xPos;
            peer.data.y = tank.data.yPos;

            peer.saveToCache();

            peer.everyPeer((p) => {
              if (
                p.data.netID !== peer.data.netID &&
                p.data.world === peer.data.world &&
                p.data.world !== "EXIT"
              ) {
                p.send(tank.parse());
              }
            });
            break;
          }
          case TankTypes.TILE_PUNCH: {
            const world = peer.hasWorld(peer.data.world);
            const item = base.items.metadata.items;
            tank.data.netID = peer.data.netID;

            // Fist
            if (tank.data.info === 18) {
              handlePunch(tank, peer, item, world);
            }
            // Others
            else {
              handlePlace(tank, peer, item, world);
            }

            peer.everyPeer((p) => {
              if (
                p.data.netID !== peer.data.netID &&
                p.data.world === peer.data.world &&
                p.data.world !== "EXIT"
              ) {
                p.send(tank);
              }
            });
            break;
          }
          case TankTypes.PEER_ENTER_DOOR: {
            if (peer.data.world === "EXIT") return;

            const world = peer.hasWorld(peer.data.world);
            const pos = tank.data.xPunch! + tank.data.yPunch! * world.data.width!;
            const block = world.data.blocks![pos];

            // TODO: add more door
            if (block.fg === 6) return peer.leaveWorld();
            break;
          }
        }
        break;
      }
    }
  }
}
