/**
 * 单位模型模块入口：所有单位都是 HD-2D 像素精灵公告板
 */
import type { CreateUnitModel } from '../contracts';
import { SpriteUnit } from '../sprites/spriteUnit';
import { unitAtlas } from '@/art/atlas';

export const createUnitModel: CreateUnitModel = (spec, quality) => new SpriteUnit(spec, unitAtlas(spec), quality);
