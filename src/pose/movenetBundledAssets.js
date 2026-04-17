import { createBundledMoveNetIOHandler } from './bundledMoveNetIO';

const _rawModel = require('../../assets/models/movenet/model.json');
const modelJson = _rawModel?.default != null ? _rawModel.default : _rawModel;
const shard1 = require('../../assets/models/movenet/group1-shard1of2.bin');
const shard2 = require('../../assets/models/movenet/group1-shard2of2.bin');

export function getBundledMoveNetModelHandler() {
  return createBundledMoveNetIOHandler(modelJson, [shard1, shard2]);
}
