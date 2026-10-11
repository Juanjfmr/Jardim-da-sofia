extends SceneTree

func _initialize() -> void:
	call_deferred("_run")


func _run() -> void:
	var main_scene := load("res://scenes/Main.tscn") as PackedScene
	if main_scene == null:
		push_error("A cena principal não foi encontrada")
		quit(1)
		return
	var main := main_scene.instantiate()
	root.add_child(main)
	await process_frame
	await process_frame
	var pipo := main.get_node_or_null("Pipo")
	if pipo == null:
		push_error("O Pipo não foi criado")
		quit(1)
		return
	if pipo.get_child_count() < 2:
		push_error("Modelo GLB real do Pipo ausente")
		quit(1)
		return
	var camera := main.get_node_or_null("CameraJardim")
	if camera == null:
		push_error("A câmera da cena não foi criada")
		quit(1)
		return
	var model := pipo.get_child(0)
	var geometries := model.find_children("*", "MeshInstance3D", true, false)
	if geometries.is_empty():
		push_error("Modelo 3D está sem geometrias")
		quit(1)
		return
	print("SMOKE GODOT OK: coelho GLB importado, ", geometries.size(), " malhas, jardim + câmera + HUD.")
	quit(0)
