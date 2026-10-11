import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState,sanitizeState} from '../src/state.js';
import {
 initialTrail,sanitizeTrail,discoverTrailClue,placeTrailPiece,changeTrailBridge,
 moveTrailBranch,meetTrailFriend,escortTrailFriend,decorateTrail,finishTrail,
} from '../src/trail-model.js';

const discoverAll=()=>['ribbon','bell','acorn'].reduce((s,id)=>discoverTrailClue(s,id),initialTrail());
const build=(method='logs')=>[0,1,2].reduce((s,i)=>placeTrailPiece(s,method,i),discoverAll());
const rescue=(method='logs')=>escortTrailFriend(meetTrailFriend(moveTrailBranch(build(method))));

test('a descoberta exige três pistas únicas e muda de ambiente sem cronômetro',()=>{
 let s=initialTrail();assert.equal(s.scene,'forest');
 s=discoverTrailClue(s,'ribbon');assert.equal(s.scene,'forest');
 assert.deepEqual(discoverTrailClue(s,'ribbon'),s,'pista repetida não progride');
 assert.deepEqual(discoverTrailClue(s,'unknown'),s,'ID desconhecido não conta');
 s=discoverTrailClue(s,'bell');s=discoverTrailClue(s,'acorn');
 assert.equal(s.scene,'river');assert.deepEqual(s.clues,['ribbon','bell','acorn']);
 assert.equal('deadline' in s,false);
});

test('a travessia permite dois projetos, mas não mistura materiais nem duplicações',()=>{
 for(const method of ['logs','lilies']){
  let s=discoverAll();
  s=placeTrailPiece(s,method,0);
  assert.equal(s.bridge,method);
  assert.equal(placeTrailPiece(s,method,0).pieces.length,1);
  assert.equal(placeTrailPiece(s,method==='logs'?'lilies':'logs',1).pieces.length,1);
  s=placeTrailPiece(s,method,1);s=placeTrailPiece(s,method,2);
  assert.equal(s.scene,'meadow');assert.deepEqual(s.pieces,[0,1,2]);
 }
 let s=placeTrailPiece(discoverAll(),'logs',0);
 s=changeTrailBridge(s);assert.equal(s.bridge,'');assert.deepEqual(s.pieces,[]);
 s=placeTrailPiece(s,'lilies',2);assert.deepEqual(s.pieces,[2]);
 assert.equal(placeTrailPiece(discoverAll(),'lilies',99).bridge,'');
});

test('o resgate depende do galho, do encontro e da volta ao jardim',()=>{
 let s=build();
 assert.equal(meetTrailFriend(s).friend,false);
 assert.equal(escortTrailFriend(s).escorted,false);
 s=moveTrailBranch(s);assert.equal(s.obstacle,true);
 s=meetTrailFriend(s);assert.equal(s.friend,true);
 s=escortTrailFriend(s);assert.equal(s.scene,'party');
 assert.equal(s.escorted,true);
});

test('decorações ficam no cenário; a recompensa só é liberada ao terminar a festa',()=>{
 let s=rescue('lilies');
 s=decorateTrail(s,'flower');
 s=decorateTrail(s,'flower');assert.equal(s.decorations.length,1);
 assert.equal(finishTrail(s).finished,false);
 s=decorateTrail(s,'lantern');s=decorateTrail(s,'ribbon');
 assert.equal(s.decorations.length,3);
 s=finishTrail(s);assert.equal(s.finished,true);
 assert.deepEqual(sanitizeState({trail:s}).trail,s);
});

test('salvamentos parciais recuperam de onde a criança parou',()=>{
 for(const partial of [discoverTrailClue(initialTrail(),'ribbon'),placeTrailPiece(discoverAll(),'lilies',1),moveTrailBranch(build()),rescue()]){
  const st={...initialState(),trail:partial};
  assert.deepEqual(sanitizeState(JSON.parse(JSON.stringify(st))).trail,partial);
 }
 assert.deepEqual(sanitizeState({}).trail,initialTrail());
});

test('dados adulterados não pulam capítulos nem geram objetos inexistentes',()=>{
 assert.deepEqual(sanitizeTrail(null),initialTrail());
 assert.equal(sanitizeTrail({scene:'party',finished:true}).scene,'forest');
 assert.equal(sanitizeTrail({clues:['ribbon','ribbon','<svg>'],bridge:'logs',pieces:[0,1,2]}).scene,'forest');
 assert.equal(sanitizeTrail({clues:['ribbon','bell','acorn'],bridge:'bad',pieces:[0,1,2]}).scene,'river');
 const s=sanitizeTrail({clues:['ribbon','bell','acorn'],bridge:'logs',pieces:[0,1,2,999],obstacle:true,friend:true,escorted:true,decorations:['flower','flower','x'],finished:true});
 assert.equal(s.scene,'party');assert.equal(s.finished,false);assert.deepEqual(s.decorations,['flower']);
});
