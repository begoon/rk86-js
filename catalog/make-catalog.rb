def build_file_screens(name) 
  screens = ""
  Dir.glob("%s/%s-*.png" % [name, name]) do |name|
    screen_link = ""
    screen_link = <<-EOS
      <a href="#{name}" target="_blank">
        <img src="#{name}" class="screen" />
      </a>
    EOS
    screens << screen_link
  end
  return screens
end

class RK86File
  attr_accessor :name, :start, :end, :size, :check_sum, :real_check_sum

  def initialize(name)
    tape_name = "../files/%s" % name
    image = IO.binread(tape_name)

    #puts tape_name

    @name = name

    if name.end_with? ".bin" then
      @size = image.length
      @start = 0
      @start = 0x10000 - @size if name.start_with? "mon"
      @end = @start + @size - 1
      @real_check_sum = rk86_checksum(image.byteslice(0, @size))
      @check_sum = @real_check_sum
    else 
      i = 0
      i += 1 if image.byteslice(i).ord == 0xe6

      @start = extract_rk86_word(image, i)
      #puts "%d: Start %04X" % [i, @start]
      @end = extract_rk86_word(image, i + 2)
      #puts "%d: End %04X" % [i, @end]
      @size = @end - @start + 1
      #puts "%d: Size %04X" % [i, @size]
      i += 4

      @real_check_sum = rk86_checksum(image.byteslice(i, @size))
      #puts "%d: Real check sum %04X" % [i, @real_check_sum]
      i += @size

      while image.byteslice(i).ord != 0xe6 do 
        #puts "%04X: %02X" % [i, image.byteslice(i).ord]
        i += 1 
      end
      @check_sum = extract_rk86_word(image, i + 1)
      #puts "%d: Check sum %04X" % [i, @real_check_sum]
    end
  end

  def rk86_checksum(v) 
    sum = 0
    j = 0
    while j < v.length - 1 do
      c = v.byteslice(j).ord
      sum = (sum + c + (c << 8)) & 0xffff
      j = j + 1
    end
    c = v.byteslice(j).ord
    sum = (sum + c ) & 0xffff
    return sum
  end

  def extract_rk86_word(v, i)
    return (v.byteslice(i).ord << 8) | v.byteslice(i + 1).ord
  end
end

def build_file_entry(name)
  #puts name

  file = RK86File.new name

  file_entry_template = ""
  file_entry_template = <<-EOS
  <tr>
    <td valign="top">
      Шахматы
      <hr/>
      Рига 1987<br/>
      <hr/>
      <table>
        <tr>
          <td>Файл:</td>
          <td>#{name}</td>
        </tr>
        <tr>
          <td>Начальный aдрес:</td>
          <td>#{ "%04X" % file.start }</td>
        </tr>
        <tr>
          <td>Конечный адрес:</td>
          <td>#{ "%04X" % file.end }</td>
        </tr>
        <tr>
          <td>Стартовый адрес:</td>
          <td>#{ "%04X" % file.start }</td>
        </tr>
        <tr>
          <td>Контрольная сумма:</td>
          <td>
            #{ "%04X" % file.check_sum }
            #{ "/ <b>Реальная сумма: %04X</b>" % file.real_check_sum if file.check_sum == file.real_check_sum }
          </td>
        </tr>
      </table>
      <button class="run" name="#{name}">Запустить</button>
    </td>
    <td valign="top">
       #{ build_file_screens(name) }
    </td>
  </tr>
  EOS
end

def build_catalog()
  catalog = ""
  Dir.glob("../files/*").each do |name|
    name = name.split("/")[-1]
    catalog << build_file_entry(name)
  end
  return catalog
end

html_template = ""

html_template = <<EOS
<html>
<head>
<meta http-equiv="content-type" content="text/html; charset=utf-8" />
<script src="catalog_main.js"></script>
</head>
<body onload="main()">

<style>
img.screen { width: auto; height: 150; vertical-align: text-top; }
</style>

<img id="preview" style="visibility: hidden; height: 300; position: absolute; top: 0; right: 0; border: 0;"/>

<table>

#{ build_catalog() }
</table>

</body>
</html>
EOS

Dir.glob("../files/*").each do |x| 
  name = x.split("/")[1]
end

puts html_template
