/**
 * 单位模型模块入口
 */
import type { CreateUnitModel } from '../contracts';
import { ProceduralUnit } from './model';

export const createUnitModel: CreateUnitModel = (spec, quality) => new ProceduralUnit(spec, quality);
