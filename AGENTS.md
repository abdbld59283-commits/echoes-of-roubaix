<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep monster threat aggregation in the shared threat module and a scene monitor; one aggregate prevents competing monsters from cancelling pursuit alerts.
- Run the attack encounter before life loss using shared camera/monster refs; this keeps the actual attacker visible until respawn or game over.
- Use browser Web Audio for proximity pulses and the uploaded capture asset for encounters; keep capture playback independent from synthesized ambience.
- Register living monster objects and hit callbacks in a shared combat registry; eliminating one removes its threat and makes hitscan target only living enemies.
- Store imported CC0 models as asset pointers with textures embedded in their GLBs; self-contained files prevent missing relative texture requests.
- Keep survivor mission state in the game owner and scene interactions in dedicated camp components; DOM dialogues and scene pickups share one progress source.
- Run the arrival as a separate camera phase before the final quest starts; the countdown and combat must not run during the cinematic.
- Use the shared maze route finder for guidance and reachability tests; visible guides must match walkable collision cells.
- Keep expedition balance and grid navigation in the shared expedition module, with followers and supplies in a dedicated scene module; this keeps team movement, boss scaling and tests consistent.
- Brigand fire, survivor hit points and weapon pickups share the allies/allyHits/supplies registries owned by the game; one source keeps team losses and pickups consistent.
- Keep presentation overlays in GameExperience and feed touch controls into the existing movement and weapon actions; presentation must not duplicate combat rules.
- Route synthesized audio through one master gain and mute capture elements separately; one audio toggle must silence both paths.
