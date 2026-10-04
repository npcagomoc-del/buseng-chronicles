import { drawAimArc } from "./aim-arc";
import { BusengActor } from "./buseng-actor";
import type { Game } from "./model";
import { drawPerfectEffect } from "./perfect-effect";
import { target, WORLD } from "./physics";
import { drawRecordGag } from "./record-gag";
import { drawFlyingRice } from "./rice-flame";
import { RiceMan } from "./rice-man";
import { drawDefeatRice, drawRiceMess } from "./rice-mess";
import { SceneEffects } from "./scene-effects";
import { drawBackdrop, fitScene } from "./scene-viewport";
import { drawSlapEffect, slapHeadOffset } from "./slap-effect";
import { drawSpicyEffect } from "./spicy-effect";
import { Tahp } from "./tahp";
export type Art = {
  readonly background: HTMLImageElement;
  readonly actors: HTMLImageElement;
  readonly riceMan: HTMLImageElement;
  readonly tahp: HTMLImageElement;
};
const RICE_COLOR = "#fffced";
export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private art: Art;
  private reduced: boolean;
  private riceMan: RiceMan;
  private tahp: Tahp;
  private character: "riceman" | "tahp" = "riceman";
  private buseng: BusengActor;
  private effects: SceneEffects;
  constructor(
    private readonly canvas: HTMLCanvasElement,
    art: Art,
    reduced: boolean,
  ) {
    const context = canvas.getContext("2d");
    if (!context) throw new TypeError("Canvas is unavailable");
    this.ctx = context;
    this.effects = new SceneEffects(context);
    this.buseng = new BusengActor(this.effects, art.actors, reduced);
    this.art = art;
    this.reduced = reduced;
    this.riceMan = new RiceMan(context, art.riceMan, reduced);
    this.tahp = new Tahp(context, art.tahp, reduced);
    fitScene(canvas, context);
  }
  setCharacter(character: "riceman" | "tahp"): void {
    this.character = character;
  }
  setTahpReply(active: boolean, mouthOpen: boolean): void {
    this.tahp.setReply(active, mouthOpen);
  }
  private get thrower(): RiceMan | Tahp {
    return this.character === "tahp" ? this.tahp : this.riceMan;
  }
  draw(game: Game): void {
    if (game.phase === "paused") return;
    const ctx = this.ctx;
    const sceneHeight = fitScene(this.canvas, ctx);
    game.setArenaHeight(sceneHeight);
    ctx.save();
    ctx.clearRect(0, 0, WORLD.width, sceneHeight);
    if (game.phase === "over" && game.age < 0.24 && !this.reduced) {
      ctx.translate(Math.sin(game.age * 90) * 4, Math.cos(game.age * 100) * 2);
    }
    drawBackdrop(ctx, this.art.background, sceneHeight);
    if (game.phase === "menu" || game.phase === "over")
      ctx.translate(0, (sceneHeight - WORLD.height) / 2);
    switch (game.phase) {
      case "menu":
        this.thrower.draw(game, "menu");
        this.buseng.draw(game, "boss", { x: 250, y: 340, width: 235, height: 280 });
        this.effects.bubble("WALA NANG KANEN|BUSENG!?", { x: 320, y: 284 });
        break;
      case "over":
        this.angry(game);
        break;
      case "ready":
      case "charging":
      case "flight":
      case "hit":
        this.play(game);
        break;
      default:
        break;
    }
    ctx.restore();
  }
  private play(game: Game): void {
    const ctx = this.ctx;
    const bossWidth = 190;
    const bossHeight = (bossWidth * 512) / 430;
    const dip =
      game.phase === "hit" && !this.reduced && game.flameCatchSeconds <= 0 && game.slapSeconds <= 0
        ? Math.sin(Math.min(1, game.age / WORLD.settleSeconds) * Math.PI) * 5
        : 0;
    if (game.teleportWarning && !this.reduced) {
      const next = target(
        game.score,
        game.clock,
        game.teleportLane + 1,
        game.arenaHeight,
        game.seed,
      );
      ctx.save();
      ctx.globalAlpha = 0.16 + Math.abs(Math.sin(game.clock * 35)) * 0.12;
      this.buseng.draw(game, "boss", {
        x: next.x - bossWidth * 0.49,
        y: next.y - bossHeight * 0.678,
        width: bossWidth,
        height: bossHeight,
      });
      this.effects.teleport(next, 0.24);
      ctx.restore();
    }
    const departure = (game.teleportFlash / game.teleportDuration - 0.53) / 0.47;
    if (departure > 0 && game.teleportOrigin && !this.reduced) {
      this.effects.actor(this.art.actors, {
        box: {
          x: game.teleportOrigin.x - bossWidth * 0.49,
          y: game.teleportOrigin.y - bossHeight * 0.678,
          width: bossWidth,
          height: bossHeight,
        },
        expression: this.buseng.expression,
        stride: 0,
        arrival: 0,
        departure,
      });
    }
    this.buseng.draw(game, "boss", {
      x: game.plate.x - bossWidth * 0.49,
      y: game.plate.y - bossHeight * 0.678 + dip,
      width: bossWidth,
      height: bossHeight,
    });
    this.thrower.draw(game, "play");
    if (game.phase === "charging") drawAimArc(ctx, game);
    if (game.teleportFlash > 0 && !this.reduced) {
      this.effects.teleport(game.plate, game.teleportFlash / game.teleportDuration);
      if (game.teleportOrigin)
        this.effects.teleport(game.teleportOrigin, game.teleportFlash / game.teleportDuration);
    }
    drawFlyingRice(ctx, game, this.effects, this.reduced);
    if (game.phase === "hit" && game.landing) {
      this.effects.rice({ x: game.landing.x, y: game.plate.y - 6 + dip }, 12, game.flamingShot);
      if (!this.reduced)
        for (let i = 0; i < 6; i++) {
          const angle = (i / 5) * Math.PI;
          const distance = game.age * 115;
          ctx.fillStyle = game.flamingShot ? "#F48B08" : RICE_COLOR;
          ctx.beginPath();
          ctx.ellipse(
            game.landing.x + Math.cos(angle) * distance,
            game.plate.y - 8 - Math.sin(angle) * distance + game.age ** 2 * 90,
            3,
            1.5,
            angle,
            0,
            Math.PI * 2,
          );
          ctx.fill();
        }
    }
    drawPerfectEffect(ctx, game, this.reduced);
    if (this.reduced || game.teleportFlash / game.teleportDuration < 0.25) {
      this.waitingSweat(game);
      drawRiceMess(ctx, {
        face: { x: game.plate.x - 3, y: game.plate.y - 105 + dip },
        scale: 1,
        faceCovered: game.faceRice,
        headCovered: false,
        shed: game.riceThrows - game.riceShedSeconds / 0.6,
        reaction: game.faceHitSeconds,
        reduced: this.reduced,
      });
    }
    drawRecordGag(ctx, game, this.effects, this.reduced);
    ctx.save();
    ctx.translate(
      (slapHeadOffset(200, game.slapSeconds, game.plate.x < 220 ? 1 : -1, this.reduced) * 190) /
        430,
      0,
    );
    drawSpicyEffect(ctx, game, this.effects, this.reduced);
    ctx.restore();
    drawSlapEffect(ctx, game, this.reduced);
  }
  private angry(game: Game): void {
    const ctx = this.ctx;
    ctx.fillStyle = "#21100638";
    ctx.fillRect(0, 0, 480, 800);
    const punch = this.reduced ? 1 : 1 + Math.sin(Math.min(1, game.age / 0.18) * Math.PI) * 0.05;
    ctx.save();
    ctx.translate(300, 445 + (this.reduced ? 0 : Math.sin(game.clock * 2) * 1.2));
    ctx.scale(punch, punch);
    this.buseng.draw(game, "rage", { x: -168, y: -205, width: 320, height: 381 });
    drawDefeatRice(ctx, game, this.reduced);
    ctx.restore();
    this.thrower.draw(game, "over");
    const face = { x: 295, y: 330 };

    for (let i = 0; i < 10; i++) {
      const elapsed = this.reduced ? 0.25 : (game.age * 0.75 + i * 0.173) % 1;
      const sign = i % 2 === 0 ? -1 : 1;
      const x = face.x + sign * (48 + (i % 3) * 6 + elapsed * 14);
      const y = face.y - 40 + (i % 5) * 8 + elapsed * elapsed * 60;
      this.effects.drop({ x, y }, 3.5 + (i % 3) * 0.6);
    }
    if (game.age < 1.8) this.effects.bubble("HOY!", { x: 72, y: 263 });
  }
  private waitingSweat(game: Game): void {
    const cadence = 0.65 + Math.min(game.level, 6) * 0.12;
    for (let i = 0; i < Math.min(8, 4 + game.level); i++) {
      const elapsed = this.reduced ? 0.15 + i * 0.09 : (game.clock * cadence + i * 0.24) % 1;
      const sign = i % 2 === 0 ? -1 : 1;
      this.effects.drop({ x: game.plate.x + sign * 39, y: game.plate.y - 92 + elapsed * 35 }, 2.2);
    }
  }
}
