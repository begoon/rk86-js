Dir.glob("../files/*").each do |x| 
  name = x.split("/")[-1]
  begin
    Dir.mkdir(name)
  rescue
  end
  info = "%s/info.md" % name
  File.open(info, "r+") {|f| f.write("") }
end
